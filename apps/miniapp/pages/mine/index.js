Page({
  data: {
    user: {},
  },

  async onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setSelected(2);
    await getApp().ensureLogin();
    this.setData({ user: getApp().globalData.user || {} });
  },

  goCategory() {
    wx.navigateTo({ url: '/subpkg/category-manage/index' });
  },

  goAccount() {
    wx.navigateTo({ url: '/subpkg/account-manage/index' });
  },

  goTag() {
    wx.navigateTo({ url: '/subpkg/tag-manage/index' });
  },
});
