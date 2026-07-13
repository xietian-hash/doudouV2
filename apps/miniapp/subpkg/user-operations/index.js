const { getUserStats } = require('../../services/admin');

Page({
  data: {
    loading: true,
    totalActive: 0,
    todayActive: 0,
    weekActive: 0,
    userList: [],
  },

  async onLoad() {
    await this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const data = await getUserStats();
      this.setData({
        totalActive: data.totalActive,
        todayActive: data.todayActive,
        weekActive: data.weekActive,
        userList: data.userList,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});
