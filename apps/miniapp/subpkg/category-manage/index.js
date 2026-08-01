const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

function normalizeCategory(item) {
  return {
    ...item,
    childrenCount: item.children ? item.children.length : 0,
    slideX: 0,
    translateY: 0,
  };
}

Page({
  data: {
    type: 1,
    categories: [],
    icons: [],
    dragging: false,
    dragIndex: -1,
    dialogVisible: false,
    confirmVisible: false,
    pendingDeleteId: '',
    pendingDeleteName: '',
    editingId: '',
    form: { name: '', icon: '' },
  },

  onShow() {
    this.load();
    if (!this.data.icons.length) {
      service.getCategoryIcons().then((icons) => this.setData({ icons }));
    }
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
    if (this.data.dragging) return;
    const index = Number(event.currentTarget.dataset.index);
    const touch = event.changedTouches[0];
    this._touchActiveIndex = index;
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchStartSlideX = this.data.categories[index].slideX || 0;
    this._swipeMode = false;
    this._dragCurrentIndex = index;

    const needCloseOthers = this.data.categories.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const categories = this.data.categories.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ categories });
    }

    this._longPressTimer = setTimeout(() => {
      this._longPressTimer = null;
      if (!this._swipeMode) this._startDrag(index);
    }, 500);
  },

  onTouchMove(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this._touchStartX;
    const dy = touch.clientY - this._touchStartY;

    if (this.data.dragging) {
      this._updateDrag(touch.clientY);
      return;
    }

    if (!this._swipeMode && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      this._swipeMode = true;
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    if (this._swipeMode) {
      let next = this._touchStartSlideX + dx;
      if (next > 0) next = 0;
      if (next < -288) next = -288;
      if (this.data.categories[index].slideX === next) return;
      const categories = this.data.categories.map((item, i) => (i === index ? { ...item, slideX: next } : item));
      this.setData({ categories });
    }
  },

  onTouchEnd(event) {
    clearTimeout(this._longPressTimer);
    this._longPressTimer = null;

    if (this.data.dragging) {
      this._endDrag();
      return;
    }

    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    this._touchActiveIndex = -1;

    if (!this._swipeMode) return;
    const startSlide = this._touchStartSlideX;
    const current = this.data.categories[index].slideX;
    const moved = current - startSlide;
    const target = startSlide === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current !== target) {
      const categories = this.data.categories.map((item, i) => (i === index ? { ...item, slideX: target } : item));
      this.setData({ categories });
    }
  },

  onTouchCancel() {
    clearTimeout(this._longPressTimer);
    this._longPressTimer = null;
    if (this.data.dragging) {
      this._endDrag();
      return;
    }
    this._touchActiveIndex = -1;
  },

  _startDrag(index) {
    wx.vibrateShort({ type: 'light' });
    this._dragCurrentIndex = index;
    this._itemRects = null;

    wx.createSelectorQuery()
      .in(this)
      .selectAll('.swipe-row')
      .boundingClientRect((rects) => { this._itemRects = rects; })
      .exec();

    const updates = { dragging: true, dragIndex: index };
    this.data.categories.forEach((_, i) => {
      updates[`categories[${i}].slideX`] = 0;
      updates[`categories[${i}].translateY`] = 0;
    });
    this.setData(updates);
  },

  _updateDrag(currentY) {
    const dy = currentY - this._touchStartY;
    const dragIndex = this.data.dragIndex;
    const rects = this._itemRects;

    if (!rects || !rects.length) {
      this.setData({ [`categories[${dragIndex}].translateY`]: dy });
      return;
    }

    const step = rects.length > 1 ? rects[1].top - rects[0].top : rects[0].height;
    const newCenter = rects[dragIndex].top + rects[dragIndex].height / 2 + dy;

    let newIndex = 0;
    for (let i = 0; i < rects.length; i++) {
      if (newCenter >= rects[i].top + rects[i].height / 2) newIndex = i;
    }
    this._dragCurrentIndex = Math.max(0, Math.min(newIndex, rects.length - 1));

    const updates = {};
    this.data.categories.forEach((item, i) => {
      let ty = 0;
      if (i === dragIndex) {
        ty = dy;
      } else if (dragIndex < this._dragCurrentIndex && i > dragIndex && i <= this._dragCurrentIndex) {
        ty = -step;
      } else if (dragIndex > this._dragCurrentIndex && i >= this._dragCurrentIndex && i < dragIndex) {
        ty = step;
      }
      if (item.translateY !== ty) updates[`categories[${i}].translateY`] = ty;
    });

    if (Object.keys(updates).length) this.setData(updates);
  },

  async _endDrag() {
    const dragIndex = this.data.dragIndex;
    const newIndex = this._dragCurrentIndex;

    const cats = this.data.categories.map((item) => ({ ...item, translateY: 0, slideX: 0 }));
    if (dragIndex !== newIndex) {
      const [moved] = cats.splice(dragIndex, 1);
      cats.splice(newIndex, 0, moved);
    }

    this.setData({ dragging: false, dragIndex: -1, categories: cats });
    this._justDragged = true;
    setTimeout(() => { this._justDragged = false; }, 300);
    this._touchActiveIndex = -1;

    if (dragIndex !== newIndex) {
      try {
        await Promise.all(cats.map((item, i) => service.updateCategory(item.id, { sort: i })));
      } catch (e) {
        showError('排序保存失败，请重试');
        this.load();
      }
    }
  },

  openCreate() {
    this.closeSwipeRows();
    this.setData({ dialogVisible: true, editingId: '', form: { name: '', icon: '' } });
  },

  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const category = this.data.categories.find((item) => String(item.id) === String(id));
    if (!category) return;
    this.setData({ dialogVisible: true, editingId: id, form: { name: category.name, icon: category.icon || '' } });
  },

  closeDialog() {
    this.setData({ dialogVisible: false, editingId: '' });
  },

  onNameInput(event) {
    this.setData({ 'form.name': String(event.detail.value || '').slice(0, 4) });
  },

  selectIcon(event) {
    this.setData({ 'form.icon': event.currentTarget.dataset.icon });
  },

  async save() {
    const name = this.data.form.name.trim();
    if (!name) {
      showError('请输入分类名称');
      return;
    }
    const payload = { name, icon: this.data.form.icon || undefined, type: this.data.type };
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
    if (this._justDragged || this.data.dragging) return;
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
