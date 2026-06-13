const billsService = require('../../services/bills');
const { buildCalendarDays, formatDate } = require('../../utils/date');
const { formatAmount } = require('../../utils/format');
const { showToast, showError } = require('../../utils/toast');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

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
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected(0);
    this.ensureAndLoad();
  },

  async ensureAndLoad() {
    await getApp().ensureLogin();
    await this.loadData();
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
});
