const auth = require('./services/auth');

const eventBus = {};

wx.$on = function on(name, handler) {
  eventBus[name] = eventBus[name] || [];
  eventBus[name].push(handler);
};

wx.$off = function off(name, handler) {
  if (!eventBus[name]) return;
  eventBus[name] = eventBus[name].filter((item) => item !== handler);
};

wx.$emit = function emit(name, payload) {
  (eventBus[name] || []).forEach((handler) => handler(payload));
};

App({
  globalData: {
    user: null,
    token: '',
    loginReady: null,
  },

  onLaunch() {
    this.globalData.loginReady = this.initAuth();
  },

  async initAuth() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      try {
        const user = await auth.getCurrentUser();
        this.globalData.user = user;
        return user;
      } catch (err) {
        wx.removeStorageSync('token');
        this.globalData.token = '';
      }
    }

    const result = await auth.login();
    this.globalData.token = result.token;
    this.globalData.user = result.user;
    wx.setStorageSync('token', result.token);
    return result.user;
  },

  ensureLogin() {
    if (!this.globalData.loginReady) {
      this.globalData.loginReady = this.initAuth();
    }
    return this.globalData.loginReady;
  },
});
