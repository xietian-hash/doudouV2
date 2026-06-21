const service = require('../../services/recurring-bills');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    bills: [],
    confirmVisible: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    touchStartX: 0,
  },

  onShow() {
    this.load();
  },

  goBack() {
    wx.navigateBack();
  },

  async load() {
    await getApp().ensureLogin();
    const bills = await service.getRecurringBills();
    this.setData({ bills: bills.map((item) => ({ ...item, slideX: 0 })) });
  },

  closeSwipeRows() {
    this.setData({ bills: this.data.bills.map((item) => ({ ...item, slideX: 0 })) });
  },

  onTouchStart(event) {
    const index = Number(event.currentTarget.dataset.index);
    this._touchActiveIndex = index;
    this._touchStartX = event.changedTouches[0].clientX;
    this._touchStartSlideX = this.data.bills[index].slideX || 0;
    const needCloseOthers = this.data.bills.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const bills = this.data.bills.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ bills });
    }
  },

  onTouchMove(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    if (next < -288) next = -288;
    if (this.data.bills[index].slideX === next) return;
    const bills = this.data.bills.map((item, i) => (i === index ? { ...item, slideX: next } : item));
    this.setData({ bills });
  },

  onTouchEnd(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    this._touchActiveIndex = -1;
    const startSlide = this._touchStartSlideX;
    const current = this.data.bills[index].slideX;
    const moved = current - startSlide;
    const target = startSlide === -288 ? (moved > 48 ? 0 : -288) : (moved < -48 ? -288 : 0);
    if (current === target) return;
    const bills = this.data.bills.map((item, i) => (i === index ? { ...item, slideX: target } : item));
    this.setData({ bills });
  },

  goEdit(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/subpkg/recurring-bill-edit/index?id=${id}` });
  },

  goCreate() {
    this.closeSwipeRows();
    wx.navigateTo({ url: '/subpkg/recurring-bill-edit/index' });
  },

  askDelete(event) {
    this.closeSwipeRows();
    const bill = this.data.bills.find((item) => String(item.id) === String(event.currentTarget.dataset.id));
    this.setData({
      confirmVisible: true,
      pendingDeleteId: event.currentTarget.dataset.id,
      pendingDeleteName: bill ? bill.categoryName : '',
    });
  },

  closeConfirm() {
    this.setData({ confirmVisible: false, pendingDeleteId: '', pendingDeleteName: '' });
  },

  async confirmDelete() {
    await service.deleteRecurringBill(this.data.pendingDeleteId);
    showToast('删除成功', 'success');
    this.closeConfirm();
    this.load();
  },

  noop() {},
});
