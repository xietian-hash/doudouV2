const accountsService = require('../../services/accounts');
const categoriesService = require('../../services/categories');
const tagsService = require('../../services/tags');
const billsService = require('../../services/bills');
const { buildCalendarDays, formatDate } = require('../../utils/date');
const { showToast, showError } = require('../../utils/toast');

const KEY_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '00'],
];
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

Page({
  data: {
    id: '',
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
    loadedBill: null,
    amountInputStarted: false,
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
    this.updateDisplayDate();
    this.ensureAndLoad();
  },

  async ensureAndLoad() {
    await getApp().ensureLogin();
    await this.loadBill();
  },

  async loadBill() {
    if (!this.data.id) {
      showError('账单不存在');
      return;
    }
    const bill = await billsService.getBillDetail(this.data.id);
    const billDate = String(bill.billDate || formatDate(new Date())).slice(0, 10);
    this.setData(
      {
        loadedBill: bill,
        type: bill.type,
        amount: String(bill.amount || '0'),
        amountInputStarted: false,
        remark: bill.remark || '',
        billDate,
        selectedTag: bill.tags && bill.tags.length ? bill.tags[0] : {},
      },
      async () => {
        this.updateDisplayDate();
        await Promise.all([this.loadCategories(), this.loadBaseData()]);
        this.applyBillSelections(bill);
      },
    );
  },

  async loadBaseData() {
    const [accounts, tags] = await Promise.all([accountsService.getAccounts(), tagsService.getTags()]);
    this.setData({ accounts, tags });
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
    const selected = sorted.find((item) => String(item.id) === String(this.data.selectedCategory.id)) || sorted[0] || {};
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

  applyBillSelections(bill) {
    const account = this.data.accounts.find((item) => String(item.id) === String(bill.accountId));
    const category = this.data.categories.find((item) => String(item.id) === String(bill.categoryId));
    this.setData({
      selectedAccount: account || {},
      selectedCategory: category || this.data.selectedCategory,
    });
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
    if (key === '⌫') {
      if (!this.data.amountInputStarted) {
        this.setData({ amount: '0', amountInputStarted: true });
        return;
      }
      const next = this.data.amount.length > 1 ? this.data.amount.slice(0, -1) : '0';
      this.setData({ amount: next });
      return;
    }
    this.inputAmount(key);
  },

  inputAmount(key) {
    let value = this.data.amountInputStarted ? this.data.amount : '';
    if (key === '.' && value.includes('.')) return;
    if (value === '' && key === '00') return;
    value += key;
    if (value.startsWith('.')) value = `0${value}`;
    if (value.includes('.') && value.split('.')[1].length > 2) return;
    if (Number(value) > 99999999) return;
    this.setData({ amount: value || '0', amountInputStarted: true });
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
    await billsService.updateBill(this.data.id, {
      accountId: this.data.selectedAccount.id,
      categoryId: this.data.selectedCategory.id,
      type: this.data.type,
      amount: this.data.amount,
      billDate: this.data.billDate,
      remark: this.data.remark || null,
      tagIds: this.data.selectedTag.id ? [this.data.selectedTag.id] : [],
    });
    showToast('修改成功', 'success');
    wx.navigateBack();
  },

  openCategorySheet() {
    this.setData({ sheet: 'category' });
  },

  openAccountSheet() {
    this.setData({ sheet: 'account' });
  },

  openTagSheet() {
    this.setData({ sheet: 'tag' });
  },

  openDateSheet() {
    const [year, month] = this.data.billDate.split('-').map(Number);
    this.setData({ sheet: 'date', calYear: year, calMonth: month }, () => this.buildDateDays());
  },

  closeSheet() {
    this.setData({ sheet: '' });
  },

  noop() {},

  selectAccount(event) {
    const id = String(event.currentTarget.dataset.id);
    this.setData({
      selectedAccount: this.data.accounts.find((item) => String(item.id) === id) || {},
      sheet: '',
    });
  },

  selectTag(event) {
    const id = String(event.currentTarget.dataset.id);
    this.setData({
      selectedTag: this.data.tags.find((item) => String(item.id) === id) || {},
      sheet: '',
    });
  },

  clearTag() {
    this.setData({ selectedTag: {}, sheet: '' });
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
  },

  selectToday() {
    this.setData({ billDate: formatDate(new Date()), sheet: '' }, () => this.updateDisplayDate());
  },

  updateDisplayDate() {
    const parts = this.data.billDate.split('-');
    this.setData({ displayDate: `${Number(parts[1])}月${Number(parts[2])}日` });
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
});
