const billsService = require('../../services/bills');
const accountsService = require('../../services/accounts');
const voiceService = require('../../services/voice');
const { buildCalendarDays, formatDate } = require('../../utils/date');
const { formatAmount } = require('../../utils/format');
const { showToast, showError } = require('../../utils/toast');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MIN_VOICE_DURATION_MS = 1000;

Page({
  data: {
    weekdays: WEEKDAYS,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    selectedDate: '',
    calendarDays: [],
    groups: [],
    todayExpense: '0.00',
    monthExpense: '0.00',
    loading: false,
    recording: false,
    recordingCanceling: false,
    voiceParsing: false,
    voiceConfirmVisible: false,
    voiceItems: [],
    defaultAccount: {},
    recordingPanelClass: 'recording-panel',
    recordingHintText: '上滑可取消',
    cancelTipClass: 'recording-tip recording-tip--cancel',
    cancelTipText: '上滑取消',
    doneTipClass: 'recording-tip recording-tip--done recording-tip--active',
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
  },

  onUnload() {
    wx.$off('voiceRecord:start', this.onVoiceStart);
    wx.$off('voiceRecord:move', this.onVoiceMove);
    wx.$off('voiceRecord:stop', this.onVoiceStop);
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected(0);
    this.ensureAndLoad();
  },

  async ensureAndLoad() {
    await getApp().ensureLogin();
    await Promise.all([this.loadData(), this.loadDefaultAccount()]);
  },

  async loadDefaultAccount() {
    const accounts = await accountsService.getAccounts();
    this.setData({ defaultAccount: accounts.find((a) => a.isDefault) || accounts[0] || {} });
  },

  monthText() {
    return `${this.data.year}-${String(this.data.month).padStart(2, '0')}`;
  },

  async loadData() {
    this.setData({ loading: true });
    const month = this.monthText();
    try {
      const [billPage, summary] = await Promise.all([
        billsService.getBills({
          month: this.data.selectedDate ? undefined : month,
          date: this.data.selectedDate || undefined,
          pageSize: 100,
        }),
        billsService.getCalendarSummary(month),
      ]);
      const bills = (billPage.list || []).map((bill) => ({
        ...bill,
        sign: bill.type === 1 ? '-' : '+',
        amountText: formatAmount(bill.amount),
        amountClass: `bill-amount${bill.type === 2 ? ' bill-amount--income' : ''}`,
        metaText: bill.remark ? `${bill.accountName} · ${bill.remark}` : bill.accountName,
        slideX: 0,
      }));
      this.setData({
        calendarDays: this.buildCalendar(summary || []),
        groups: this.buildGroups(bills),
        todayExpense: this.calcTodayExpense(bills),
        monthExpense: this.calcMonthExpense(bills),
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  buildCalendar(summary) {
    const map = {};
    summary.forEach((item) => {
      map[item.date] = item;
    });
    const today = formatDate(new Date());
    return buildCalendarDays(this.data.year, this.data.month).map((day, index) => {
      if (!day) return { key: `empty-${index}`, empty: true };
      const date = `${this.data.year}-${String(this.data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const item = map[date] || {};
      return {
        key: date,
        day,
        date,
        selected: this.data.selectedDate === date,
        today: today === date,
        expense: Number(item.expenseAmount || 0) > 0 ? Number(item.expenseAmount).toFixed(0) : '',
        income: Number(item.incomeAmount || 0) > 0 ? Number(item.incomeAmount).toFixed(0) : '',
      };
    });
  },

  buildGroups(bills) {
    const grouped = {};
    bills.forEach((bill) => {
      const date = String(bill.billDate).slice(0, 10);
      grouped[date] = grouped[date] || [];
      grouped[date].push(bill);
    });
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const items = grouped[date];
        const expense = items.filter((bill) => bill.type === 1).reduce((sum, bill) => sum + Number(bill.amount), 0);
        const income = items.filter((bill) => bill.type === 2).reduce((sum, bill) => sum + Number(bill.amount), 0);
        const parts = date.split('-');
        return {
          date,
          title: `${Number(parts[1])}月${Number(parts[2])}日`,
          expense,
          income,
          expenseText: formatAmount(expense),
          incomeText: formatAmount(income),
          items,
        };
      });
  },

  calcTodayExpense(bills) {
    const today = formatDate(new Date());
    const total = bills
      .filter((bill) => bill.type === 1 && String(bill.billDate).slice(0, 10) === today)
      .reduce((sum, bill) => sum + Number(bill.amount), 0);
    return formatAmount(total);
  },

  calcMonthExpense(bills) {
    const total = bills.filter((bill) => bill.type === 1).reduce((sum, bill) => sum + Number(bill.amount), 0);
    return formatAmount(total);
  },

  prevMonth() {
    const next = new Date(this.data.year, this.data.month - 2, 1);
    this.setData({ year: next.getFullYear(), month: next.getMonth() + 1, selectedDate: '' }, () => this.loadData());
  },

  nextMonth() {
    const next = new Date(this.data.year, this.data.month, 1);
    this.setData({ year: next.getFullYear(), month: next.getMonth() + 1, selectedDate: '' }, () => this.loadData());
  },

  selectDate(event) {
    const date = event.currentTarget.dataset.date;
    if (!date) return;
    this.setData({ selectedDate: this.data.selectedDate === date ? '' : date }, () => this.loadData());
  },

  closeSwipeRows() {
    const groups = this.data.groups.map((group) => ({
      ...group,
      items: group.items.map((bill) => ({ ...bill, slideX: 0 })),
    }));
    this.setData({ groups });
  },

  updateBillSlide(groupIndex, billIndex, slideX) {
    const groups = this.data.groups.map((group, gi) => {
      if (gi !== groupIndex) {
        return {
          ...group,
          items: group.items.map((bill) => ({ ...bill, slideX: 0 })),
        };
      }
      return {
        ...group,
        items: group.items.map((bill, bi) => ({ ...bill, slideX: bi === billIndex ? slideX : 0 })),
      };
    });
    this.setData({ groups });
  },

  onTouchStart(event) {
    const groupIndex = Number(event.currentTarget.dataset.groupIndex);
    const billIndex = Number(event.currentTarget.dataset.billIndex);
    const bill = this.data.groups[groupIndex] && this.data.groups[groupIndex].items[billIndex];
    if (!bill) return;
    this._touchActive = { groupIndex, billIndex };
    this._touchStartX = event.changedTouches[0].clientX;
    this._touchStartSlideX = bill.slideX || 0;
  },

  onTouchMove(event) {
    const groupIndex = Number(event.currentTarget.dataset.groupIndex);
    const billIndex = Number(event.currentTarget.dataset.billIndex);
    if (!this._touchActive || this._touchActive.groupIndex !== groupIndex || this._touchActive.billIndex !== billIndex) {
      return;
    }
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    if (next < -288) next = -288;
    const current = this.data.groups[groupIndex].items[billIndex].slideX || 0;
    if (current === next) return;
    this.updateBillSlide(groupIndex, billIndex, next);
  },

  onTouchEnd(event) {
    const groupIndex = Number(event.currentTarget.dataset.groupIndex);
    const billIndex = Number(event.currentTarget.dataset.billIndex);
    if (!this._touchActive || this._touchActive.groupIndex !== groupIndex || this._touchActive.billIndex !== billIndex) {
      return;
    }
    this._touchActive = null;
    const current = this.data.groups[groupIndex].items[billIndex].slideX || 0;
    const moved = current - this._touchStartSlideX;
    const target = this._touchStartSlideX === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current === target) return;
    this.updateBillSlide(groupIndex, billIndex, target);
  },

  openDetail(event) {
    const groupIndex = Number(event.currentTarget.dataset.groupIndex);
    const billIndex = Number(event.currentTarget.dataset.billIndex);
    const bill = this.data.groups[groupIndex] && this.data.groups[groupIndex].items[billIndex];
    if (bill && bill.slideX) {
      this.closeSwipeRows();
      return;
    }
    this.openEdit(event);
  },

  openEdit(event) {
    this.closeSwipeRows();
    wx.navigateTo({
      url: `/subpkg/bill-edit/index?id=${event.currentTarget.dataset.id}`,
    });
  },

  async deleteBill(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    this.closeSwipeRows();
    try {
      await billsService.deleteBill(id);
      showToast('删除成功', 'success');
      await this.loadData();
    } catch (error) {
      showError('删除失败');
    }
  },

  setTabBarHidden(hidden) {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar && tabBar.setHidden) tabBar.setHidden(hidden);
  },

  noop() {},

  buildRecordingViewState(recording, canceling) {
    return {
      recording: Boolean(recording),
      recordingCanceling: Boolean(canceling),
      recordingPanelClass: `recording-panel${canceling ? ' recording-panel--canceling' : ''}`,
      recordingHintText: canceling ? '松开取消' : '上滑可取消',
      cancelTipClass: `recording-tip recording-tip--cancel${canceling ? ' recording-tip--active' : ''}`,
      cancelTipText: canceling ? '松开取消' : '上滑取消',
      doneTipClass: `recording-tip recording-tip--done${canceling ? '' : ' recording-tip--active'}`,
    };
  },

  buildVoiceItemView(item, index) {
    const dateText = (() => {
      if (!item.billDate) return '';
      const parts = String(item.billDate).split('-');
      return `${Number(parts[1])}月${Number(parts[2])}日`;
    })();
    const metaParts = [];
    if (dateText) metaParts.push(dateText);
    if (item.remark) metaParts.push(item.remark);
    return {
      ...item,
      _localId: `voice_${Date.now()}_${index}`,
      amount: String(item.amount || '0'),
      billDateText: dateText,
      categoryText: `${item.categoryIcon || '□'} ${item.categoryName || '未匹配分类'}`,
      amountSign: item.type === 1 ? '-' : '+',
      amountClass: `voice-amount${item.type === 2 ? ' voice-amount--income' : ''}`,
      metaText: metaParts.join(' · '),
    };
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
      this.setData(this.buildRecordingViewState(false, false));
      if (this._abortVoiceUpload) {
        this._abortVoiceUpload = false;
        return;
      }
      if (!res.tempFilePath) return;
      this.setData({ voiceParsing: true });
      try {
        const parsed = await voiceService.uploadAudioAndParse(res.tempFilePath);
        const items = (parsed || []).map((item, index) => this.buildVoiceItemView(item, index));
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
      this.setData(this.buildRecordingViewState(false, false));
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
    if (this._pendingStopPayload) {
      const payload = this._pendingStopPayload;
      this._pendingStopPayload = null;
      this._startingRecord = false;
      const duration = Number((payload && payload.duration) || 0);
      const canceled = Boolean(payload && payload.canceled);
      if (canceled) showToast('已取消', 'none');
      else if (duration < MIN_VOICE_DURATION_MS) showError('录音时间太短，请长按说话');
      return;
    }
    this._abortVoiceUpload = false;
    this._recorderStarted = false;
    this._stopBeforeStart = null;
    this.setData(this.buildRecordingViewState(true, false));
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
    this.setData(this.buildRecordingViewState(true, canceling));
  },

  stopRecording(payload) {
    if (this._startingRecord) {
      this._pendingStopPayload = payload || {};
      return;
    }
    if (!this.data.recording) return;
    const duration = Number((payload && payload.duration) || 0);
    const canceled = Boolean(payload && payload.canceled);
    this.setData(this.buildRecordingViewState(false, false));
    if (!this._recorderStarted) {
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
    if (!this.data.defaultAccount.id) {
      showError('未找到默认账户');
      return;
    }
    const items = this.data.voiceItems
      .filter((item) => item.categoryId)
      .map((item) => ({
        accountId: this.data.defaultAccount.id,
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
    await this.loadData();
  },
});
