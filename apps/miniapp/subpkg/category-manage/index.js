const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

Page({
  data: {
    type: 1,
    categories: [],
    dialogVisible: false,
    form: { name: '', icon: '' },
  },

  onShow() {
    this.load();
  },

  async load() {
    await getApp().ensureLogin();
    this.setData({ categories: await service.getCategories({ type: this.data.type }) });
  },

  switchType(event) {
    this.setData({ type: Number(event.currentTarget.dataset.type) }, () => this.load());
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
    });
    showToast('添加成功', 'success');
    this.closeDialog();
    this.load();
  },

  openChildren(event) {
    const { id, name } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/subpkg/category-manage/sub-categories?parentId=${id}&parentName=${encodeURIComponent(name)}&type=${this.data.type}`,
    });
  },

  remove(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除分类',
      content: '有子分类或账单关联时不可删除，确认删除？',
      success: async (res) => {
        if (!res.confirm) return;
        await service.deleteCategory(id);
        showToast('删除成功', 'success');
        this.load();
      },
    });
  },
});
