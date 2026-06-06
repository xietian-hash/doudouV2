const feedbackService = require('../../services/feedback');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    content: '',
    images: [],
    submitting: false,
  },

  goBack() {
    wx.navigateBack();
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value });
  },

  chooseImages() {
    const remain = 3 - this.data.images.length;
    if (remain <= 0) {
      showError('最多上传 3 张照片');
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const selected = (res.tempFiles || []).map((item) => ({
          path: item.tempFilePath,
        }));
        this.setData({ images: this.data.images.concat(selected).slice(0, 3) });
      },
    });
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.path;
    wx.previewImage({
      current,
      urls: this.data.images.map((item) => item.path),
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({
      images: this.data.images.filter((_item, itemIndex) => itemIndex !== index),
    });
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
      const imageUrls = [];
      for (const image of this.data.images) {
        imageUrls.push(await feedbackService.uploadImage(image.path));
      }
      await feedbackService.submitFeedback({ content, imageUrls });
      showToast('反馈已提交', 'success');
      this.setData({ content: '', images: [] });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (err) {
      showError(err.message || '提交失败，请重试');
    } finally {
      this.setData({ submitting: false });
    }
  },
});
