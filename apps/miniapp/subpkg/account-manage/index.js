const service = require('../../services/accounts');
const { showToast, showError } = require('../../utils/toast');

const TYPES = [
  { value: 1, label: '现金', icon: '💵' },
  { value: 2, label: '银行卡', icon: '🏦' },
  { value: 3, label: '支付宝', icon: '📱' },
  { value: 4, label: '微信', icon: '💬' },
  { value: 5, label: '其他', icon: '💳' },
];

function formatMoney(value) {
  const number = Number(value || 0);
  return number.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeAccount(item) {
  const type = TYPES.find((option) => option.value === Number(item.type)) || TYPES[4];
  const balanceNumber = Number(item.balance || 0);
  return {
    ...item,
    icon: item.icon || type.icon,
    typeLabel: type.label,
    balanceNumber,
    balanceText: formatMoney(balanceNumber),
    slideX: 0,
  };
}

Page({
  data: {
    accounts: [],
    totalBalance: '0.00',
    dialogVisible: false,
    confirmVisible: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    editingId: '',
    types: TYPES,
    form: { name: '', type: 1, icon: '💵' },
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
    const accounts = (await service.getAccounts()).map(normalizeAccount);
    const total = accounts.reduce((sum, item) => sum + item.balanceNumber, 0);
    this.setData({
      accounts,
      totalBalance: formatMoney(total),
    });
  },

  closeSwipeRows() {
    this.setData({
      accounts: this.data.accounts.map((item) => ({ ...item, slideX: 0 })),
    });
  },

  onTouchStart(event) {
    const index = Number(event.currentTarget.dataset.index);
    this._touchActiveIndex = index;
    this._touchStartX = event.changedTouches[0].clientX;
    this._touchStartSlideX = this.data.accounts[index].slideX || 0;
    const needCloseOthers = this.data.accounts.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const accounts = this.data.accounts.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ accounts });
    }
  },

  onTouchMove(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    if (next < -288) next = -288;
    if (this.data.accounts[index].slideX === next) return;
    const accounts = this.data.accounts.map((item, i) => (i === index ? { ...item, slideX: next } : item));
    this.setData({ accounts });
  },

  onTouchEnd(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    this._touchActiveIndex = -1;
    const startSlide = this._touchStartSlideX;
    const current = this.data.accounts[index].slideX;
    const moved = current - startSlide;
    const target = startSlide === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current === target) return;
    const accounts = this.data.accounts.map((item, i) => (i === index ? { ...item, slideX: target } : item));
    this.setData({ accounts });
  },

  openCreate() {
    this.closeSwipeRows();
    this.setData({
      dialogVisible: true,
      editingId: '',
      form: { name: '', type: 1, icon: '💵' },
    });
  },

  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const account = this.data.accounts.find((item) => String(item.id) === String(id));
    if (!account) return;
    this.setData({
      dialogVisible: true,
      editingId: id,
      form: {
        name: account.name,
        type: Number(account.type),
        icon: account.icon,
      },
    });
  },

  closeDialog() {
    this.setData({ dialogVisible: false, editingId: '' });
  },

  onNameInput(event) {
    this.setData({ 'form.name': event.detail.value });
  },

  selectType(event) {
    const type = Number(event.currentTarget.dataset.type);
    const found = TYPES.find((item) => item.value === type);
    this.setData({ 'form.type': type, 'form.icon': found.icon });
  },

  async save() {
    const name = this.data.form.name.trim();
    if (!name) {
      showError('请输入账户名称');
      return;
    }
    const payload = { ...this.data.form, name };
    if (this.data.editingId) {
      await service.updateAccount(this.data.editingId, payload);
      showToast('修改成功', 'success');
    } else {
      await service.createAccount(payload);
      showToast('添加成功', 'success');
    }
    this.closeDialog();
    this.load();
  },

  askDelete(event) {
    this.setData({
      confirmVisible: true,
      pendingDeleteId: event.currentTarget.dataset.id,
      pendingDeleteName: event.currentTarget.dataset.name,
    });
  },

  closeConfirm() {
    this.setData({ confirmVisible: false, pendingDeleteId: '', pendingDeleteName: '' });
  },

  async confirmDelete() {
    await service.deleteAccount(this.data.pendingDeleteId);
    showToast('删除成功', 'success');
    this.closeConfirm();
    this.load();
  },
});
