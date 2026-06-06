const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    parentId: '',
    parentName: '',
    type: 1,
    children: [],
    dialogVisible: false,
    form: { name: '', icon: '' },
  },

  onLoad(options) {
    this.setData({
      parentId: options.parentId,
      parentName: decodeURIComponent(options.parentName || ''),
      type: Number(options.type || 1),
    });
  },

  onShow() {
    this.load();
  },

  async load() {
    await getApp().ensureLogin();
    const tree = await service.getCategories({ type: this.data.type });
    const parent = tree.find((item) => String(item.id) === String(this.data.parentId));
    this.setData({ children: parent && parent.children ? parent.children : [] });
  },

  openCreate() {
    this.setData({ dialogVisible: true, form: { name: '', icon: '' } });
  },

  closeDialog() {
    this.setData({ dialogVisible: false });
  },

  onNameInput(event) {
    this.setData({ 'form.name': event.detail.value });
  },

  onIconInput(event) {
    this.setData({ 'form.icon': event.detail.value });
  },

  async save() {
    const name = this.data.form.name.trim();
    if (!name) {
      showError('请输入分类名称');
      return;
    }
    await service.createCategory({
      name,
      icon: this.data.form.icon || undefined,
      type: this.data.type,
      parentId: this.data.parentId,
    });
    showToast('添加成功', 'success');
    this.closeDialog();
    this.load();
  },

  remove(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除子分类',
      content: '有关联账单时不可删除，确认删除？',
      success: async (res) => {
        if (!res.confirm) return;
        await service.deleteCategory(id);
        showToast('删除成功', 'success');
        this.load();
      },
    });
  },
});
