const { request, post } = require('./request');
const { BASE_URL } = require('../utils/config');

function uploadAudioAndParse(filePath) {
  const app = getApp();
  const token = app.globalData.token || wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${BASE_URL}/api/voice/upload-audio`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        try {
          const envelope = JSON.parse(res.data);
          if (envelope.code !== 0) {
            reject(new Error(envelope.message || '语音解析失败'));
            return;
          }
          resolve(envelope.data.bills || envelope.data || []);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}

function parseText(text) {
  return post('/api/voice/parse', { text });
}

module.exports = {
  uploadAudioAndParse,
  parseText,
};
