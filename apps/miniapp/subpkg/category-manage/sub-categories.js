const service = require('../../services/categories');
const { showToast, showError } = require('../../utils/toast');

function normalizeChild(item) {
  return { ...item, slideX: 0, translateY: 0 };
}

Page({
  data: {
    parentId: '',
    parentName: '',
    type: 1,
    children: [],
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

  onLoad(options) {
    this.setData({
      parentId: options.parentId,
      parentName: decodeURIComponent(options.parentName || ''),
      type: Number(options.type || 1),
    });
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
    if (this.data.dragging) return;
    const index = Number(event.currentTarget.dataset.index);
    const touch = event.changedTouches[0];
    this._touchActiveIndex = index;
    this._touchStartX = touch.clientX;
    this._touchStartY = touch.clientY;
    this._touchStartSlideX = this.data.children[index].slideX || 0;
    this._swipeMode = false;
    this._dragCurrentIndex = index;

    const needCloseOthers = this.data.children.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const children = this.data.children.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ children });
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
      if (this.data.children[index].slideX === next) return;
      const children = this.data.children.map((item, i) => (i === index ? { ...item, slideX: next } : item));
      this.setData({ children });
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
    const current = this.data.children[index].slideX;
    const moved = current - startSlide;
    const target = startSlide === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current !== target) {
      const children = this.data.children.map((item, i) => (i === index ? { ...item, slideX: target } : item));
      this.setData({ children });
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
    this.data.children.forEach((_, i) => {
      updates[`children[${i}].slideX`] = 0;
      updates[`children[${i}].translateY`] = 0;
    });
    this.setData(updates);
  },

  _updateDrag(currentY) {
    const dy = currentY - this._touchStartY;
    const dragIndex = this.data.dragIndex;
    const rects = this._itemRects;

    if (!rects || !rects.length) {
      this.setData({ [`children[${dragIndex}].translateY`]: dy });
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
    this.data.children.forEach((item, i) => {
      let ty = 0;
      if (i === dragIndex) {
        ty = dy;
      } else if (dragIndex < this._dragCurrentIndex && i > dragIndex && i <= this._dragCurrentIndex) {
        ty = -step;
      } else if (dragIndex > this._dragCurrentIndex && i >= this._dragCurrentIndex && i < dragIndex) {
        ty = step;
      }
      if (item.translateY !== ty) updates[`children[${i}].translateY`] = ty;
    });

    if (Object.keys(updates).length) this.setData(updates);
  },

  async _endDrag() {
    const dragIndex = this.data.dragIndex;
    const newIndex = this._dragCurrentIndex;

    const kids = this.data.children.map((item) => ({ ...item, translateY: 0, slideX: 0 }));
    if (dragIndex !== newIndex) {
      const [moved] = kids.splice(dragIndex, 1);
      kids.splice(newIndex, 0, moved);
    }

    this.setData({ dragging: false, dragIndex: -1, children: kids });
    this._touchActiveIndex = -1;

    if (dragIndex !== newIndex) {
      try {
        await Promise.all(kids.map((item, i) => service.updateCategory(item.id, { sort: i })));
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
    const child = this.data.children.find((item) => String(item.id) === String(id));
    if (!child) return;
    this.setData({ dialogVisible: true, editingId: id, form: { name: child.name, icon: child.icon || '' } });
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
    const payload = { name, icon: this.data.form.icon || undefined, type: this.data.type, parentId: this.data.parentId };
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
