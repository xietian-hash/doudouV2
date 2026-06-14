const accountsService = require('../../services/accounts');
const categoriesService = require('../../services/categories');
const tagsService = require('../../services/tags');
const billsService = require('../../services/bills');
const voiceService = require('../../services/voice');
const { buildCalendarDays, formatDate, formatDisplayDate } = require('../../utils/date');
const { showToast, showError } = require('../../utils/toast');

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '00'],
];
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MIN_VOICE_DURATION_MS = 1000;
const ACCOUNT_TYPES = [
  { value: 1, label: '现金', icon: '💼' },
  { value: 2, label: '银行卡', icon: '🏦' },
  { value: 3, label: '支付宝', icon: '📱' },
  { value: 4, label: '微信', icon: '💬' },
  { value: 5, label: '其他', icon: '💳' },
];

Page({
  data: {
    keyRows: KEY_ROWS,
    weekdays: WEEKDAYS,
    type: 1,
    amount: '0',
    remark: '',
    billDate: formatDate(new Date()),
    displayDate: '',
    categories: [],
    categoryTree: [],
    categorySections: [],
    displayCategories: [],
    selectedCategory: {},
    accounts: [],
    selectedAccount: {},
    tags: [],
    selectedTag: {},
    sheet: '',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1,
    dateDays: [],
    recording: false,
    recordingCanceling: false,
    voiceParsing: false,
    voiceConfirmVisible: false,
    voiceItems: [],
    editId: '',
    accountDialogVisible: false,
    accountTypes: ACCOUNT_TYPES,
    accountForm: { name: '', type: 1, icon: '💼' },
    tagDialogVisible: false,
    tagName: '',
  },

  onLoad() {
    this.recorder = wx.getRecorderManager();
    this._startingRecord = false;
    this._pendingStopPayload = null;
    this.initRecorder();
    this.onVoiceStart = () => this.startRecording();
    this.onVoiceMove = (payload) => this.updateRecordingCancel(payload || {});
    this.onVoiceStop = (payload) => this.stopRecording(payload || {});
    wx.$on('voiceRecord:start', this.onVoiceStart);
    wx.$on('voiceRecord:move', this.onVoiceMove);
    wx.$on('voiceRecord:stop', this.onVoiceStop);
    this.updateDisplayDate();
  },

  onUnload() {
    wx.$off('voiceRecord:start', this.onVoiceStart);
    wx.$off('voiceRecord:move', this.onVoiceMove);
    wx.$off('voiceRecord:stop', this.onVoiceStop);
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) {
      tabBar.setSelected(1);
      tabBar.setHidden(false);
    }
    this.ensureAndLoad();
  },

  async ensureAndLoad() {
    await getApp().ensureLogin();
    await Promise.all([this.loadCategories(), this.loadBaseData()]);
    this.loadEditDraft();
  },

  async loadBaseData() {
    const [accounts, tags] = await Promise.all([accountsService.getAccounts(), tagsService.getTags()]);
    this.setData({
      accounts,
      tags,
      selectedAccount: this.data.selectedAccount.id
        ? this.data.selectedAccount
        : accounts.find((item) => item.isDefault) || accounts[0] || {},
    });
  },

  async loadCategories() {
    const [categories, tree] = await Promise.all([
      categoriesService.getCategories({ type: this.data.type, onlyLeaf: true }),
      categoriesService.getCategories({ type: this.data.type }),
    ]);
    const sorted = categories.slice().sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
      if (a.lastUsedAt) return -1;
      if (b.lastUsedAt) return 1;
      return (a.sort || 0) - (b.sort || 0);
    });
    const selected = sorted.find((item) => item.id === this.data.selectedCategory.id) || sorted[0] || {};
    this.setData({
      categories: sorted,
      categoryTree: tree,
      displayCategories: sorted.slice(0, 23),
      selectedCategory: selected,
      categorySections: this.buildSections(tree, sorted),
    });
  },

  buildSections(tree, leaves) {
    const leafIds = new Set(leaves.map((item) => item.id));
    const sections = (tree || [])
      .filter((parent) => !parent.parentId && parent.children && parent.children.length)
      .map((parent) => ({
        title: parent.name,
        items: parent.children.filter((child) => leafIds.has(child.id)),
      }))
      .filter((section) => section.items.length);
    return sections.length ? sections : [{ title: '分类', items: leaves }];
  },

  switchType(event) {
    const type = Number(event.currentTarget.dataset.type);
    if (type === this.data.type) return;
    this.setData({ type, selectedCategory: {} }, () => this.loadCategories());
  },

  selectCategory(event) {
    const id = String(event.currentTarget.dataset.id);
    const selected = this.data.categories.find((item) => String(item.id) === id) || {};
    this.setData({ selectedCategory: selected });
  },

  selectCategoryFromSheet(event) {
    this.selectCategory(event);
    this.closeSheet();
  },

  onRemarkInput(event) {
    this.setData({ remark: event.detail.value });
  },

  handleKey(event) {
    const key = event.currentTarget.dataset.key;
    if (key === '完成') {
      this.saveBill();
      return;
    }
    if (key === '清空') {
      this.setData({ amount: '0' });
      return;
    }
    if (key === '⌫') {
      const next = this.data.amount.length > 1 ? this.data.amount.slice(0, -1) : '0';
      this.setData({ amount: next });
      return;
    }
    this.inputAmount(key);
  },

  inputAmount(key) {
    let value = this.data.amount === '0' && key !== '.' ? '' : this.data.amount;
    if (key === '.' && value.includes('.')) return;
    if (value === '' && key === '00') return;
    value += key;
    if (value.startsWith('.')) value = `0${value}`;
    if (value.includes('.') && value.split('.')[1].length > 2) return;
    if (Number(value) > 99999999) return;
    this.setData({ amount: value || '0' });
  },

  async saveBill() {
    if (!this.data.selectedAccount.id) {
      showError('请选择账户');
      return;
    }
    if (!this.data.selectedCategory.id) {
      showError('请选择分类');
      return;
    }
    if (!Number(this.data.amount)) {
      showError('请输入金额');
      return;
    }
    const payload = {
      accountId: this.data.selectedAccount.id,
      categoryId: this.data.selectedCategory.id,
      type: this.data.type,
      amount: this.data.amount,
      billDate: this.data.billDate,
      remark: this.data.remark || undefined,
      tagIds: this.data.selectedTag.id ? [this.data.selectedTag.id] : undefined,
      source: 1,
    };
    if (this.data.editId) {
      await billsService.updateBill(this.data.editId, payload);
      showToast('修改成功', 'success');
    } else {
      await billsService.createBill(payload);
      showToast('记账成功', 'success');
    }
    this.setData({ amount: '0', remark: '', selectedTag: {}, editId: '' });
    wx.switchTab({ url: '/pages/record/index' });
  },

  loadEditDraft() {
    const draft = wx.getStorageSync('editBillDraft');
    if (!draft || this.data.editId === draft.id) return;
    wx.removeStorageSync('editBillDraft');
    const next = {
      editId: draft.id,
      type: draft.type,
      amount: String(draft.amount || '0'),
      remark: draft.remark || '',
      billDate: String(draft.billDate || formatDate(new Date())).slice(0, 10),
      selectedTag: draft.tags && draft.tags.length ? draft.tags[0] : {},
    };
    this.setData(next, () => {
      this.updateDisplayDate();
      this.loadCategories();
      this.loadBaseData().then(() => {
        const account = this.data.accounts.find((item) => String(item.id) === String(draft.accountId));
        const category = this.data.categories.find((item) => String(item.id) === String(draft.categoryId));
        this.setData({
          selectedAccount: account || this.data.selectedAccount,
          selectedCategory: category || this.data.selectedCategory,
        });
      });
    });
  },

  openCategorySheet() {
    this.setData({ sheet: 'category' });
    this.setTabBarHidden(true);
  },

  openAccountSheet() {
    this.setData({ sheet: 'account' });
    this.setTabBarHidden(true);
  },

  openTagSheet() {
    this.setData({ sheet: 'tag' });
    this.setTabBarHidden(true);
  },

  openDateSheet() {
    const [year, month] = this.data.billDate.split('-').map(Number);
    this.setData({ sheet: 'date', calYear: year, calMonth: month }, () => this.buildDateDays());
    this.setTabBarHidden(true);
  },

  closeSheet() {
    this.setData({ sheet: '' });
    this.setTabBarHidden(false);
  },

  setTabBarHidden(hidden) {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setHidden) tabBar.setHidden(hidden);
  },

  noop() {},

  selectAccount(event) {
    const id = String(event.currentTarget.dataset.id);
    this.setData({
      selectedAccount: this.data.accounts.find((item) => String(item.id) === id) || {},
      sheet: '',
    });
    this.setTabBarHidden(false);
  },

  selectTag(event) {
    const id = String(event.currentTarget.dataset.id);
    this.setData({
      selectedTag: this.data.tags.find((item) => String(item.id) === id) || {},
      sheet: '',
    });
    this.setTabBarHidden(false);
  },

  clearTag() {
    this.setData({ selectedTag: {}, sheet: '' });
    this.setTabBarHidden(false);
  },

  buildDateDays() {
    const today = formatDate(new Date());
    const days = buildCalendarDays(this.data.calYear, this.data.calMonth).map((day, index) => {
      if (!day) return { key: `empty-${index}`, day: '', date: '' };
      const date = `${this.data.calYear}-${String(this.data.calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { key: date, day, date, selected: date === this.data.billDate, today: date === today };
    });
    this.setData({ dateDays: days });
  },

  prevCalMonth() {
    const next = new Date(this.data.calYear, this.data.calMonth - 2, 1);
    this.setData({ calYear: next.getFullYear(), calMonth: next.getMonth() + 1 }, () => this.buildDateDays());
  },

  nextCalMonth() {
    const next = new Date(this.data.calYear, this.data.calMonth, 1);
    this.setData({ calYear: next.getFullYear(), calMonth: next.getMonth() + 1 }, () => this.buildDateDays());
  },

  selectDate(event) {
    const date = event.currentTarget.dataset.date;
    if (!date) return;
    this.setData({ billDate: date, sheet: '' }, () => this.updateDisplayDate());
    this.setTabBarHidden(false);
  },

  selectToday() {
    this.setData({ billDate: formatDate(new Date()), sheet: '' }, () => this.updateDisplayDate());
    this.setTabBarHidden(false);
  },

  updateDisplayDate() {
    this.setData({ displayDate: formatDisplayDate(this.data.billDate) });
  },

  openCategoryManage() {
    wx.navigateTo({ url: '/subpkg/category-manage/index' });
  },

  openAccountManage() {
    wx.navigateTo({ url: '/subpkg/account-manage/index' });
  },

  openTagManage() {
    wx.navigateTo({ url: '/subpkg/tag-manage/index' });
  },

  openCreateAccountDialog() {
    this.setData({
      accountDialogVisible: true,
      accountForm: { name: '', type: 1, icon: '💼' },
    });
  },

  closeAccountDialog() {
    this.setData({ accountDialogVisible: false });
  },

  onAccountNameInput(event) {
    this.setData({ 'accountForm.name': event.detail.value });
  },

  selectAccountType(event) {
    const type = Number(event.currentTarget.dataset.type);
    const found = ACCOUNT_TYPES.find((item) => item.value === type) || ACCOUNT_TYPES[4];
    this.setData({ 'accountForm.type': found.value, 'accountForm.icon': found.icon });
  },

  async saveNewAccount() {
    const name = this.data.accountForm.name.trim();
    if (!name) {
      showError('请输入账户名称');
      return;
    }
    const created = await accountsService.createAccount({ ...this.data.accountForm, name });
    showToast('添加成功', 'success');
    this.setData({ accountDialogVisible: false });
    const accounts = await accountsService.getAccounts();
    const selected = accounts.find((item) => String(item.id) === String(created && created.id))
      || accounts.find((item) => item.name === name)
      || this.data.selectedAccount;
    this.setData({ accounts, selectedAccount: selected });
  },

  openCreateTagDialog() {
    this.setData({ tagDialogVisible: true, tagName: '' });
  },

  closeTagDialog() {
    this.setData({ tagDialogVisible: false, tagName: '' });
  },

  onTagNameInput(event) {
    this.setData({ tagName: String(event.detail.value || '').slice(0, 4) });
  },

  async saveNewTag() {
    const name = this.data.tagName.trim();
    if (!name) {
      showError('请输入标签名称');
      return;
    }
    const created = await tagsService.createTag(name);
    showToast('添加成功', 'success');
    this.setData({ tagDialogVisible: false, tagName: '' });
    const tags = await tagsService.getTags();
    const selected = tags.find((item) => String(item.id) === String(created && created.id))
      || tags.find((item) => item.name === name)
      || {};
    this.setData({ tags, selectedTag: selected });
  },

  initRecorder() {
    this._recorderStarted = false;
    this._stopBeforeStart = null;

    this.recorder.onStart(() => {
      const pending = this._stopBeforeStart;
      this._stopBeforeStart = null;
      this._recorderStarted = true;
      if (pending !== null) {
        this._abortVoiceUpload = true;
        this.recorder.stop();
        if (pending.canceled) showToast('已取消', 'none');
        else showError('录音时间太短，请长按说话');
      }
    });
    this.recorder.onStop(async (res) => {
      this._recorderStarted = false;
      this._stopBeforeStart = null;
      this.setData({ recording: false, recordingCanceling: false });
      if (this._abortVoiceUpload) {
        this._abortVoiceUpload = false;
        return;
      }
      if (!res.tempFilePath) return;
      this.setData({ voiceParsing: true });
      try {
        const parsed = await voiceService.uploadAudioAndParse(res.tempFilePath);
        const items = (parsed || []).map((item, index) => ({
          ...item,
          _localId: `voice_${Date.now()}_${index}`,
          amount: String(item.amount || '0'),
          billDateText: item.billDate ? formatDisplayDate(item.billDate) : '',
        }));
        if (!items.length) {
          showError('未识别到记账信息');
          return;
        }
        this.setData({ voiceItems: items, voiceConfirmVisible: true });
        this.setTabBarHidden(true);
      } catch (err) {
        showError('语音解析失败，请重试');
      } finally {
        this.setData({ voiceParsing: false });
      }
    });
    this.recorder.onError(() => {
      this._recorderStarted = false;
      this._stopBeforeStart = null;
      this.setData({ recording: false, recordingCanceling: false });
      this._abortVoiceUpload = false;
      showError('录音失败，请重试');
    });
  },

  startRecording() {
    if (this.data.voiceParsing || this.data.recording) return;
    if (this._startingRecord) return;
    this._startingRecord = true;
    this._pendingStopPayload = null;
    wx.getSetting({
      success: (setting) => {
        if (setting.authSetting['scope.record'] === false) {
          this._startingRecord = false;
          this._pendingStopPayload = null;
          showError('需授权后才能使用语音记账');
          return;
        }
        this.doStartRecording();
      },
      fail: () => this.doStartRecording(),
    });
  },

  doStartRecording() {
    // 启动期间用户已松手：丢弃启动，按"过短/取消"逻辑收尾，避免录音界面卡住
    if (this._pendingStopPayload) {
      const payload = this._pendingStopPayload;
      this._pendingStopPayload = null;
      this._startingRecord = false;
      const duration = Number((payload && payload.duration) || 0);
      const canceled = Boolean(payload && payload.canceled);
      if (canceled) {
        showToast('已取消', 'none');
      } else if (duration < MIN_VOICE_DURATION_MS) {
        showError('录音时间太短，请长按说话');
      }
      return;
    }
    this._abortVoiceUpload = false;
    this._recorderStarted = false;
    this._stopBeforeStart = null;
    this.setData({ recording: true, recordingCanceling: false });
    this._startingRecord = false;
    this.recorder.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    });
  },

  updateRecordingCancel(payload) {
    if (!this.data.recording) return;
    const canceling = Boolean(payload.canceling);
    if (this.data.recordingCanceling === canceling) return;
    this.setData({ recordingCanceling: canceling });
  },

  stopRecording(payload) {
    // 启动流程还未完成（如权限查询异步未回）时，先把 stop 意图缓存，由 doStartRecording 兜底
    if (this._startingRecord) {
      this._pendingStopPayload = payload || {};
      return;
    }
    if (!this.data.recording) return;
    const duration = Number((payload && payload.duration) || 0);
    const canceled = Boolean(payload && payload.canceled);
    this.setData({ recording: false, recordingCanceling: false });
    if (!this._recorderStarted) {
      // recorder.start() 已调用但 onStart 尚未回调（如等待授权弹窗），缓存停止意图
      this._stopBeforeStart = { duration, canceled };
      return;
    }
    if (canceled) {
      this._abortVoiceUpload = true;
      this.recorder.stop();
      showToast('已取消', 'none');
      return;
    }
    if (duration < MIN_VOICE_DURATION_MS) {
      this._abortVoiceUpload = true;
      this.recorder.stop();
      showError('录音时间太短，请长按说话');
      return;
    }
    this._abortVoiceUpload = false;
    this.recorder.stop();
  },

  closeVoiceConfirm() {
    this.setData({ voiceConfirmVisible: false, voiceItems: [] });
    this.setTabBarHidden(false);
  },

  removeVoiceItem(event) {
    const id = event.currentTarget.dataset.id;
    this.setData({ voiceItems: this.data.voiceItems.filter((item) => item._localId !== id) });
  },

  async saveVoiceItems() {
    if (!this.data.selectedAccount.id) {
      showError('请先选择账户');
      return;
    }
    const items = this.data.voiceItems
      .filter((item) => item.categoryId)
      .map((item) => ({
        accountId: this.data.selectedAccount.id,
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        billDate: item.billDate || formatDate(new Date()),
        remark: item.remark || undefined,
        source: 2,
        voiceText: item.voiceText,
      }));
    if (!items.length) {
      showError('请先完善分类信息');
      return;
    }
    await billsService.createBillBatch(items);
    showToast('保存成功', 'success');
    this.closeVoiceConfirm();
    wx.switchTab({ url: '/pages/record/index' });
  },
});
