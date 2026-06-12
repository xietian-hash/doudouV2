const { post } = require('../../services/request');
const { BASE_URL } = require('../../utils/config');

function uploadImage(filePath) {
  const app = getApp();
  const token = app.globalData.token || wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${BASE_URL}/api/feedback/images`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success(res) {
        try {
          const envelope = JSON.parse(res.data);
          if (envelope.code !== 0) {
            reject(new Error(envelope.message || '照片上传失败'));
            return;
          }
          resolve(envelope.data.url);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}

function submitFeedback(data) {
  return post('/api/feedback', data);
}

module.exports = {
  uploadImage,
  submitFeedback,
};
