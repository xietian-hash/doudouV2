const accountsService = require('../../services/accounts');
const categoriesService = require('../../services/categories');
const rbService = require('../../services/recurring-bills');
const { buildCalendarDays, formatDate } = require('../../utils/date');
const { showToast, showError } = require('../../utils/toast');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

function buildDayOptions(max) {
  return Array.from({ length: max }, (_, i) => ({ label: `${i + 1}日`, value: i + 1 }));
}

Page({
  data: {
    id: '',
    isEdit: false,
    type: 1,
    amount: '',
    remark: '',
    repeatType: 1,
    repeatDay: 1,
    repeatMonth: 1,
    startDate: formatDate(new Date()),
    endDate: '',
    selectedCategory: {},
    selectedAccount: {},
    categories: [],
    categorySections: [],
    accounts: [],
    sheet: '',
    calField: '',
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth() + 1,
    dateDays: [],
    weekdays: WEEKDAYS,
    monthNames: MONTH_NAMES,
    dayOptions: buildDayOptions(31),
  },

  goBack() {
    wx.navigateBack();
  },

  onLoad(options) {
    this.setData({ id: options.id || '', isEdit: !!options.id });
    this.ensureAndLoad();
  },

  async ensureAndLoad() {
    await getApp().ensureLogin();
    await Promise.all([this.loadBaseData()]);
    if (this.data.isEdit) {
      await this.loadBill();
    }
  },

  async loadBaseData() {
    const [accounts] = await Promise.all([accountsService.getAccounts()]);
    const defaultAccount = accounts.find((item) => item.isDefault) || accounts[0] || {};
    this.setData({ accounts, selectedAccount: this.data.selectedAccount.id ? this.data.selectedAccount : defaultAccount });
    await this.loadCategories();
  },

  async loadCategories() {
    const [leaves, tree] = await Promise.all([
      categoriesService.getCategories({ type: this.data.type, onlyLeaf: true }),
      categoriesService.getCategories({ type: this.data.type }),
    ]);
    const sorted = leaves.slice().sort((a, b) => {
      if (a.lastUsedAt && b.lastUsedAt) return b.lastUsedAt.localeCompare(a.lastUsedAt);
      if (a.lastUsedAt) return -1;
      if (b.lastUsedAt) return 1;
      return (a.sort || 0) - (b.sort || 0);
    });
    const sections = this.buildSections(tree, sorted);
    const defaultCat = this.data.selectedCategory.id ? this.data.selectedCategory : sorted[0] || {};
    this.setData({ categories: sorted, categorySections: sections, selectedCategory: defaultCat });
  },

  buildSections(tree, leaves) {
    const leafIds = new Set(leaves.map((item) => item.id));
    const sections = (tree || [])
      .filter((p) => !p.parentId && p.children && p.children.length)
      .map((p) => ({ title: p.name, items: p.children.filter((c) => leafIds.has(c.id)) }))
      .filter((s) => s.items.length);
    return sections.length ? sections : [{ title: '分类', items: leaves }];
  },

  async loadBill() {
    const bill = await rbService.getRecurringBill(this.data.id);
    const account = this.data.accounts.find((item) => String(item.id) === String(bill.accountId)) || {};
    this.setData(
      {
        type: bill.type,
        amount: bill.amount,
        remark: bill.remark || '',
        repeatType: bill.repeatType,
        repeatDay: bill.repeatDay || 1,
        repeatMonth: bill.repeatMonth || 1,
        startDate: bill.startDate,
        endDate: bill.endDate || '',
        selectedAccount: account,
      },
      async () => {
        await this.loadCategories();
        const category = this.data.categories.find((item) => String(item.id) === String(bill.categoryId)) || {};
        this.setData({ selectedCategory: category });
      },
    );
  },

  switchType(event) {
    const type = Number(event.currentTarget.dataset.type);
    if (type === this.data.type) return;
    this.setData({ type, selectedCategory: {} }, () => this.loadCategories());
  },

  selectRepeatType(event) {
    const repeatType = Number(event.currentTarget.dataset.type);
    this.setData({ repeatType });
  },

  onRepeatDayChange(event) {
    this.setData({ repeatDay: Number(event.detail.value) + 1 });
  },

  onRepeatMonthChange(event) {
    this.setData({ repeatMonth: Number(event.detail.value) + 1 });
  },

  onAmountInput(event) {
    this.setData({ amount: event.detail.value });
  },

  onRemarkInput(event) {
    this.setData({ remark: event.detail.value });
  },

  openCategorySheet() {
    this.setData({ sheet: 'category' });
  },

  openAccountSheet() {
    this.setData({ sheet: 'account' });
  },

  openStartDateSheet() {
    const [year, month] = this.data.startDate.split('-').map(Number);
    this.setData({ sheet: 'date', calField: 'startDate', calYear: year, calMonth: month }, () => this.buildDateDays());
  },

  openEndDateSheet() {
    const dateStr = this.data.endDate || this.data.startDate;
    const [year, month] = dateStr.split('-').map(Number);
    this.setData({ sheet: 'date', calField: 'endDate', calYear: year, calMonth: month }, () => this.buildDateDays());
  },

  clearEndDate() {
    this.setData({ endDate: '' });
  },

  closeSheet() {
    this.setData({ sheet: '' });
  },

  noop() {},

  selectCategory(event) {
    const id = String(event.currentTarget.dataset.id);
    const selected = this.data.categories.find((item) => String(item.id) === id) || {};
    this.setData({ selectedCategory: selected, sheet: '' });
  },

  selectAccount(event) {
    const id = String(event.currentTarget.dataset.id);
    this.setData({
      selectedAccount: this.data.accounts.find((item) => String(item.id) === id) || {},
      sheet: '',
    });
  },

  buildDateDays() {
    const today = formatDate(new Date());
    const days = buildCalendarDays(this.data.calYear, this.data.calMonth).map((day, index) => {
      if (!day) return { key: `empty-${index}`, day: '', date: '' };
      const date = `${this.data.calYear}-${String(this.data.calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const field = this.data.calField;
      const selected = date === this.data[field];
      return { key: date, day, date, selected, today: date === today };
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
    const field = this.data.calField;
    this.setData({ [field]: date, sheet: '' });
  },

  selectToday() {
    const field = this.data.calField;
    this.setData({ [field]: formatDate(new Date()), sheet: '' });
  },

  async save() {
    if (!this.data.selectedAccount.id) return showError('请选择账户');
    if (!this.data.selectedCategory.id) return showError('请选择分类');
    const amount = parseFloat(this.data.amount);
    if (!amount || amount <= 0) return showError('请输入有效金额');
    if (this.data.repeatType === 2 && !this.data.repeatDay) return showError('请选择每月几号');
    if (this.data.repeatType === 3 && (!this.data.repeatDay || !this.data.repeatMonth)) return showError('请选择月份和日期');
    if (this.data.endDate && this.data.endDate < this.data.startDate) return showError('结束日期不能早于开始日期');

    const payload = {
      accountId: this.data.selectedAccount.id,
      categoryId: this.data.selectedCategory.id,
      type: this.data.type,
      amount,
      remark: this.data.remark || undefined,
      repeatType: this.data.repeatType,
      repeatDay: this.data.repeatType >= 2 ? this.data.repeatDay : undefined,
      repeatMonth: this.data.repeatType === 3 ? this.data.repeatMonth : undefined,
      startDate: this.data.startDate,
      endDate: this.data.endDate || undefined,
    };

    if (this.data.isEdit) {
      await rbService.updateRecurringBill(this.data.id, payload);
    } else {
      await rbService.createRecurringBill(payload);
    }
    wx.showModal({
      title: this.data.isEdit ? '修改成功' : '添加成功',
      content: '若有历史账单将在明天凌晨自动补齐',
      showCancel: false,
      confirmText: '好的',
      success: () => wx.navigateBack(),
    });
  },
});
