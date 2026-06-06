const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

function normalizeCategory(item) {
  return {
    ...item,
    childrenCount: item.children ? item.children.length : 0,
    slideX: 0,
  };
}

Page({
  data: {
    type: 1,
    categories: [],
    dialogVisible: false,
    confirmVisible: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    editingId: '',
    form: { name: '', icon: '' },
    touchStartX: 0,
  },

  onShow() {
    this.load();
  },

  goBack() {
    wx.navigateBack();
  },

  async load() {
    await getApp().ensureLogin();
    const categories = (await service.getCategories({ type: this.data.type })).map(normalizeCategory);
    this.setData({ categories });
  },

  switchType(event) {
    const type = Number(event.currentTarget.dataset.type);
    if (type === this.data.type) return;
    this.setData({ type }, () => this.load());
  },

  closeSwipeRows() {
    this.setData({
      categories: this.data.categories.map((item) => ({ ...item, slideX: 0 })),
    });
  },

  onTouchStart(event) {
    const index = Number(event.currentTarget.dataset.index);
    this._touchActiveIndex = index;
    this._touchStartX = event.changedTouches[0].clientX;
    this._touchStartSlideX = this.data.categories[index].slideX || 0;
    const needCloseOthers = this.data.categories.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const categories = this.data.categories.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ categories });
    }
  },

  onTouchMove(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    if (next < -288) next = -288;
    if (this.data.categories[index].slideX === next) return;
    const categories = this.data.categories.map((item, i) => (i === index ? { ...item, slideX: next } : item));
    this.setData({ categories });
  },

  onTouchEnd(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    this._touchActiveIndex = -1;
    const startSlide = this._touchStartSlideX;
    const current = this.data.categories[index].slideX;
    const moved = current - startSlide;
    const target = startSlide === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current === target) return;
    const categories = this.data.categories.map((item, i) => (i === index ? { ...item, slideX: target } : item));
    this.setData({ categories });
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
    const category = this.data.categories.find((item) => String(item.id) === String(id));
    if (!category) return;
    this.setData({
      dialogVisible: true,
      editingId: id,
      form: { name: category.name, icon: category.icon || '' },
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

  openChildren(event) {
    const { id, name } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/subpkg/category-manage/sub-categories?parentId=${id}&parentName=${encodeURIComponent(name)}&type=${this.data.type}`,
    });
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
