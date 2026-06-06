const { BASE_URL } = require('../utils/config');
const { showError } = require('../utils/toast');

function generateTraceId() {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function buildQuery(params) {
  if (!params) return '';
  const pairs = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

function request(url, options = {}) {
  const app = getApp();
  const token = app.globalData.token || wx.getStorageSync('token');
  const method = options.method || 'GET';
  const finalUrl = method === 'GET' ? `${BASE_URL}${url}${buildQuery(options.data)}` : `${BASE_URL}${url}`;

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalUrl,
      method,
      data: method === 'GET' ? undefined : options.data,
      header: {
        'Content-Type': 'application/json',
        'x-trace-id': generateTraceId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success(res) {
        const envelope = res.data || {};
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          app.globalData.token = '';
          app.globalData.user = null;
          showError('登录已失效，请重新进入');
          reject(new Error('Unauthorized'));
          return;
        }
        if (envelope.code !== 0) {
          const message = envelope.message || '操作失败，请重试';
          if (!(options.silentCodes || []).includes(envelope.code)) {
            showError(message);
          }
          reject(Object.assign(new Error(message), { code: envelope.code, details: envelope.details }));
          return;
        }
        resolve(envelope.data);
      },
      fail(err) {
        showError('网络异常，请稍后重试');
        reject(err);
      },
    });
  });
}

module.exports = {
  get: (url, data) => request(url, { method: 'GET', data }),
  post: (url, data) => request(url, { method: 'POST', data }),
  patch: (url, data) => request(url, { method: 'PATCH', data }),
  del: (url, options = {}) => request(url, { method: 'DELETE', ...options }),
  request,
};
