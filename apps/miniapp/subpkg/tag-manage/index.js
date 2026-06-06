const service = require('../../services/tags');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    tags: [],
    dialogVisible: false,
    name: '',
  },

  onShow() {
    this.load();
  },

  async load() {
    await getApp().ensureLogin();
    this.setData({ tags: await service.getTags() });
  },

  openCreate() {
    this.setData({ dialogVisible: true, name: '' });
  },

  closeDialog() {
    this.setData({ dialogVisible: false });
  },

  onInput(event) {
    this.setData({ name: event.detail.value });
  },

  async save() {
    const name = this.data.name.trim();
    if (!name) {
      showError('请输入标签名称');
      return;
    }
    await service.createTag(name);
    showToast('添加成功', 'success');
    this.closeDialog();
    this.load();
  },

  remove(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除标签',
      content: '删除后账单将不再关联该标签，确认删除？',
      success: async (res) => {
        if (!res.confirm) return;
        await service.deleteTag(id);
        showToast('删除成功', 'success');
        this.load();
      },
    });
  },
});
