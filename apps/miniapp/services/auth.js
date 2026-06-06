const { get, post } = require('./request');

function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) resolve(res.code);
        else reject(new Error('微信登录失败'));
      },
      fail: reject,
    });
  });
}

async function login() {
  const wxCode = await wxLogin();
  return post('/api/auth/wechat-login', { wxCode });
}

function getCurrentUser() {
  return get('/api/users/me');
}

module.exports = {
  login,
  getCurrentUser,
};
