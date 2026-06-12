const service = require('../../services/bills');
const { showToast } = require('../../utils/toast');

Page({
  data: {
    id: '',
    bill: {},
  },

  onLoad(options) {
    this.setData({ id: options.id });
  },

  onShow() {
    this.load();
  },

  async load() {
    await getApp().ensureLogin();
    const bill = await service.getBillDetail(this.data.id);
    this.setData({ bill });
  },

  edit() {
    wx.navigateTo({ url: `/subpkg/bill-edit/index?id=${this.data.id}` });
  },

  remove() {
    wx.showModal({
      title: '删除账单',
      content: '删除后账户余额会同步回滚，确认删除？',
      success: async (res) => {
        if (!res.confirm) return;
        await service.deleteBill(this.data.id);
        showToast('删除成功', 'success');
        wx.navigateBack();
      },
    });
  },
});
