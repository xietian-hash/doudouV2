const { BASE_URL } = require('../../utils/config');
const { showToast, showError } = require('../../utils/toast');

const TEMPLATE_URL = `${BASE_URL}/api/import/template`;
const UPLOAD_URL = `${BASE_URL}/api/import/bills`;
const TEMPLATE_FILENAME = '兜兜有钱-导入模板.xlsx';
const ERROR_FILENAME = '兜兜有钱-错误清单.xlsx';

Page({
  data: {
    loading: false,
    loadingText: '',
    resultDialogVisible: false,
    resultIsSuccess: false,
    resultTitle: '',
    resultMessage: '',
    errorFileUrl: '',
    errorCount: 0,
  },

  noop() {},

  closeResultDialog() {
    this.setData({ resultDialogVisible: false });
  },

  onGetTemplate() {
    if (this.data.loading) return;
    this.setData({ loading: true, loadingText: '正在生成模板...' });
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('token');

    wx.downloadFile({
      url: TEMPLATE_URL,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode !== 200) {
          showError('模板下载失败，请重试');
          return;
        }
        this.shareFile(res.tempFilePath, TEMPLATE_FILENAME);
      },
      fail: () => {
        showError('模板下载失败，请检查网络');
      },
      complete: () => {
        this.setData({ loading: false });
      },
    });
  },

  onUploadFile() {
    if (this.data.loading) return;
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('token');

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          showError('文件大小不能超过 10MB');
          return;
        }
        this.uploadFile(file.path, token);
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        showError('选择文件失败，请重试');
      },
    });
  },

  uploadFile(filePath, token) {
    this.setData({ loading: true, loadingText: '正在导入账单...' });
    wx.uploadFile({
      url: UPLOAD_URL,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 180000,
      success: (res) => {
        try {
          const envelope = JSON.parse(res.data);
          if (envelope.code !== 0) {
            showError(envelope.message || '导入失败，请重试');
            return;
          }
          const data = envelope.data || {};
          this.showResult(data);
        } catch (err) {
          showError('服务响应解析失败');
        }
      },
      fail: () => {
        showError('上传失败，请检查网络');
      },
      complete: () => {
        this.setData({ loading: false });
      },
    });
  },

  showResult(data) {
    const isSuccess = !!data.success && data.errorCount === 0;
    this.setData({
      resultDialogVisible: true,
      resultIsSuccess: isSuccess,
      resultTitle: isSuccess ? '导入完成' : '导入失败',
      resultMessage: data.message || '',
      errorFileUrl: data.errorFileUrl || '',
      errorCount: data.errorCount || 0,
    });
  },

  onDownloadErrorFile() {
    if (!this.data.errorFileUrl) return;
    this.setData({ loading: true, loadingText: '正在下载错误清单...' });
    const app = getApp();
    const token = app.globalData.token || wx.getStorageSync('token');
    wx.downloadFile({
      url: this.data.errorFileUrl,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        if (res.statusCode !== 200) {
          showError('下载失败，请重试');
          return;
        }
        this.shareFile(res.tempFilePath, ERROR_FILENAME);
        this.closeResultDialog();
      },
      fail: () => {
        showError('下载失败，请检查网络');
      },
      complete: () => {
        this.setData({ loading: false });
      },
    });
  },

  shareFile(filePath, fileName) {
    if (typeof wx.shareFileMessage !== 'function') {
      showError('当前微信版本过低，请升级后再试');
      return;
    }
    wx.shareFileMessage({
      filePath,
      fileName,
      success: () => {
        showToast('已发送，请到聊天选择"文件传输助手"', 'none');
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        showError('转发失败，请重试');
      },
    });
  },
});
