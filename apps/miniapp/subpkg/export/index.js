const exportService = require('../../services/export');
const { showToast, showError } = require('../../utils/toast');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Page({
  data: {
    email: '',
    exporting: false,
  },

  goBack() {
    wx.navigateBack();
  },

  onEmailInput(e) {
    this.setData({ email: e.detail.value });
  },

  async onExport() {
    if (this.data.exporting) return;
    const email = this.data.email.trim();
    if (!email) {
      showError('请输入邮箱地址');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      showError('邮箱格式不正确');
      return;
    }

    this.setData({ exporting: true });
    try {
      await exportService.exportBills(email);
      showToast('邮件已发送，请注意查收（含垃圾箱）', 'success');
    } catch (_) {
      // 错误已由 request.js 统一提示
    } finally {
      this.setData({ exporting: false });
    }
  },
});
