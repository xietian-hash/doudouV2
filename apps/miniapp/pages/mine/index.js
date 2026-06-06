const { BASE_URL } = require('../../utils/config');

Page({
  data: {
    user: {},
    avatarText: '我',
    version: '0.1.10',
    importDialogVisible: false,
    importUrl: `${BASE_URL}/import/bills`,
  },

  async onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected(2);
    await getApp().ensureLogin();
    const user = getApp().globalData.user || {};
    const nickname = user.nickname || '';
    this.setData({
      user,
      avatarText: nickname ? nickname.slice(0, 1) : '我',
    });
  },

  noop() {},

  goCategory() {
    wx.navigateTo({ url: '/subpkg/category-manage/index' });
  },

  goAccount() {
    wx.navigateTo({ url: '/subpkg/account-manage/index' });
  },

  goTag() {
    wx.navigateTo({ url: '/subpkg/tag-manage/index' });
  },

  goAbout() {
    wx.navigateTo({ url: '/subpkg/about/index' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/subpkg/feedback/index' });
  },

  openImportDialog() {
    this.setData({ importDialogVisible: true });
  },

  closeImportDialog() {
    this.setData({ importDialogVisible: false });
  },

  copyImportUrl() {
    wx.setClipboardData({
      data: this.data.importUrl,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' });
      },
    });
  },
});
