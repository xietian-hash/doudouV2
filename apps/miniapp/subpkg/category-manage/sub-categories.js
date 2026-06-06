const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

function normalizeChild(item) {
  return { ...item, slideX: 0 };
}

Page({
  data: {
    parentId: '',
    parentName: '',
    type: 1,
    children: [],
    dialogVisible: false,
    confirmVisible: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    editingId: '',
    form: { name: '', icon: '' },
    touchStartX: 0,
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

  goBack() {
    wx.navigateBack();
  },

  async load() {
    await getApp().ensureLogin();
    const tree = await service.getCategories({ type: this.data.type });
    const parent = tree.find((item) => String(item.id) === String(this.data.parentId));
    this.setData({ children: parent && parent.children ? parent.children.map(normalizeChild) : [] });
  },

  closeSwipeRows() {
    this.setData({
      children: this.data.children.map((item) => ({ ...item, slideX: 0 })),
    });
  },

  onTouchStart(event) {
    this.setData({ touchStartX: event.changedTouches[0].clientX });
  },

  onTouchEnd(event) {
    const index = Number(event.currentTarget.dataset.index);
    const diff = event.changedTouches[0].clientX - this.data.touchStartX;
    const children = this.data.children.map((item, itemIndex) => ({
      ...item,
      slideX: itemIndex === index && diff < -35 ? -288 : 0,
    }));
    this.setData({ children });
  },

  openCreate() {
    this.closeSwipeRows();
    this.setData({
      dialogVisible: true,
      editingId: '',
      form: { name: '', icon: '' },
    });
  },

  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const child = this.data.children.find((item) => String(item.id) === String(id));
    if (!child) return;
    this.setData({
      dialogVisible: true,
      editingId: id,
      form: { name: child.name, icon: child.icon || '' },
    });
  },

  closeDialog() {
    this.setData({ dialogVisible: false, editingId: '' });
  },

  onNameInput(event) {
    this.setData({ 'form.name': String(event.detail.value || '').slice(0, 4) });
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
    const payload = {
      name,
      icon: this.data.form.icon || undefined,
      type: this.data.type,
      parentId: this.data.parentId,
    };
    if (this.data.editingId) {
      await service.updateCategory(this.data.editingId, payload);
      showToast('修改成功', 'success');
    } else {
      await service.createCategory(payload);
      showToast('添加成功', 'success');
    }
    this.closeDialog();
    this.load();
  },

  askDelete(event) {
    this.setData({
      confirmVisible: true,
      pendingDeleteId: event.currentTarget.dataset.id,
      pendingDeleteName: event.currentTarget.dataset.name,
    });
  },

  closeConfirm() {
    this.setData({ confirmVisible: false, pendingDeleteId: '', pendingDeleteName: '' });
  },

  async confirmDelete() {
    await service.deleteCategory(this.data.pendingDeleteId);
    showToast('删除成功', 'success');
    this.closeConfirm();
    this.load();
  },
});
