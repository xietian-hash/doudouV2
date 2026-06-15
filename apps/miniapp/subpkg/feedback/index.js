const feedbackService = require('./feedback.service');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    content: '',
    submitting: false,
  },

  goBack() {
    wx.navigateBack();
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value });
  },

  async submit() {
    const content = this.data.content.trim();
    if (!content) {
      showError('请输入反馈意见');
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    try {
      await getApp().ensureLogin();
      await feedbackService.submitFeedback({ content });
      showToast('反馈已提交', 'success');
      this.setData({ content: '' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      showError(err.message || '提交失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },
});
