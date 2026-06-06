const billsService = require('../../services/bills');
const { buildCalendarDays, formatDate } = require('../../utils/date');
const { formatAmount } = require('../../utils/format');

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

  openDetail(event) {
    wx.navigateTo({
      url: `/subpkg/bill-detail/index?id=${event.currentTarget.dataset.id}`,
    });
  },
});
