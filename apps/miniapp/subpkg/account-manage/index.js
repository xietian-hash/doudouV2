const service = require('../../services/accounts');
const { showToast, showError } = require('../../utils/toast');

const TYPES = [
  { value: 1, label: '现金', icon: '💵' },
  { value: 2, label: '银行卡', icon: '🏦' },
  { value: 3, label: '支付宝', icon: '📱' },
  { value: 4, label: '微信', icon: '💬' },
  { value: 5, label: '其他', icon: '💰' },
];

Page({
  data: {
    accounts: [],
    dialogVisible: false,
    types: TYPES,
    form: { name: '', type: 1, icon: '💵' },
  },

  onShow() {
    this.load();
  },

  async load() {
    await getApp().ensureLogin();
    this.setData({ accounts: await service.getAccounts() });
  },

  openCreate() {
    this.setData({ dialogVisible: true, form: { name: '', type: 1, icon: '💵' } });
  },

  closeDialog() {
    this.setData({ dialogVisible: false });
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
    if (!this.data.form.name.trim()) {
      showError('请输入账户名称');
      return;
    }
    await service.createAccount(this.data.form);
    showToast('添加成功', 'success');
    this.closeDialog();
    this.load();
  },

  async setDefault(event) {
    await service.setDefaultAccount(event.currentTarget.dataset.id);
    showToast('设置成功', 'success');
    this.load();
  },

  remove(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除账户',
      content: '有关联账单的账户不可删除，确认删除？',
      success: async (res) => {
        if (!res.confirm) return;
        await service.deleteAccount(id);
        showToast('删除成功', 'success');
        this.load();
      },
    });
  },
});
