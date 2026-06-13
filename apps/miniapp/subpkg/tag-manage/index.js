const service = require('../../services/tags');
const { showToast, showError } = require('../../utils/toast');

const TAG_ICONS = ['#', '票', '家', '工', '餐', '行', '孩', '旅', '?'];
const TAG_TONES = [
  'tag-icon--green',
  'tag-icon--orange',
  'tag-icon--green',
  'tag-icon--blue',
  'tag-icon--pink',
  'tag-icon--green',
  'tag-icon--orange',
  'tag-icon--blue',
  'tag-icon--gray',
];
const TAG_TYPE_TEXT = {
  economic: '经济属性',
  system: '系统标签',
};

function canSwipe(item) {
  return Boolean(item && (item.canEdit || item.canDelete));
}

function normalizeTag(item, index) {
  const tagType = item.tagType || 'user';
  const canEdit = item.canEdit !== false;
  const canDelete = item.canDelete !== false;
  return {
    ...item,
    tagType,
    canEdit,
    canDelete,
    canSwipe: canEdit || canDelete,
    tagTypeText: TAG_TYPE_TEXT[tagType] || '',
    showTagType: tagType !== 'user' && Boolean(TAG_TYPE_TEXT[tagType]),
    icon: TAG_ICONS[index % TAG_ICONS.length],
    toneClass: TAG_TONES[index % TAG_TONES.length],
    slideX: 0,
  };
}

Page({
  data: {
    tags: [],
    dialogVisible: false,
    confirmVisible: false,
    editingId: '',
    pendingDeleteId: '',
    pendingDeleteName: '',
    name: '',
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
    const tags = (await service.getTags()).map(normalizeTag);
    this.setData({ tags });
  },

  closeSwipeRows() {
    this.setData({
      tags: this.data.tags.map((item) => ({ ...item, slideX: 0 })),
    });
  },

  onTouchStart(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (!canSwipe(this.data.tags[index])) {
      this._touchActiveIndex = -1;
      this.closeSwipeRows();
      return;
    }
    this._touchActiveIndex = index;
    this._touchStartX = event.changedTouches[0].clientX;
    this._touchStartSlideX = this.data.tags[index].slideX || 0;
    const needCloseOthers = this.data.tags.some((item, i) => i !== index && item.slideX);
    if (needCloseOthers) {
      const tags = this.data.tags.map((item, i) => (i === index ? item : { ...item, slideX: 0 }));
      this.setData({ tags });
    }
  },

  onTouchMove(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    if (!canSwipe(this.data.tags[index])) return;
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    const max = this.data.tags[index].canEdit && this.data.tags[index].canDelete ? -288 : -144;
    if (next < max) next = max;
    if (this.data.tags[index].slideX === next) return;
    const tags = this.data.tags.map((item, i) => (i === index ? { ...item, slideX: next } : item));
    this.setData({ tags });
  },

  onTouchEnd(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index !== this._touchActiveIndex) return;
    this._touchActiveIndex = -1;
    const startSlide = this._touchStartSlideX;
    const current = this.data.tags[index].slideX;
    const moved = current - startSlide;
    const max = this.data.tags[index].canEdit && this.data.tags[index].canDelete ? -288 : -144;
    const target = startSlide === max ? (moved > 96 ? 0 : max) : moved < -96 ? max : 0;
    if (current === target) return;
    const tags = this.data.tags.map((item, i) =>
      i === index ? { ...item, slideX: target } : item,
    );
    this.setData({ tags });
  },

  openCreate() {
    this.closeSwipeRows();
    this.setData({ dialogVisible: true, editingId: '', name: '' });
  },

  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const tag = this.data.tags.find((item) => item.id === id);
    if (tag && !tag.canEdit) {
      this.closeSwipeRows();
      showError('该标签不允许编辑');
      return;
    }
    this.closeSwipeRows();
    this.setData({
      dialogVisible: true,
      editingId: id,
      name: event.currentTarget.dataset.name,
    });
  },

  closeDialog() {
    this.setData({ dialogVisible: false, editingId: '', name: '' });
  },

  onInput(event) {
    this.setData({ name: String(event.detail.value || '').slice(0, 4) });
  },

  async save() {
    const name = this.data.name.trim();
    if (!name) {
      showError('请输入标签名称');
      return;
    }
    if (this.data.editingId) {
      await service.updateTag(this.data.editingId, name);
      showToast('修改成功', 'success');
    } else {
      await service.createTag(name);
      showToast('添加成功', 'success');
    }
    this.closeDialog();
    this.load();
  },

  askDelete(event) {
    const id = event.currentTarget.dataset.id;
    const tag = this.data.tags.find((item) => item.id === id);
    if (tag && !tag.canDelete) {
      this.closeSwipeRows();
      showError('该标签不允许删除');
      return;
    }
    this.setData({
      confirmVisible: true,
      pendingDeleteId: id,
      pendingDeleteName: event.currentTarget.dataset.name,
    });
  },

  closeConfirm() {
    this.setData({ confirmVisible: false, pendingDeleteId: '', pendingDeleteName: '' });
  },

  async confirmDelete() {
    await service.deleteTag(this.data.pendingDeleteId);
    showToast('删除成功', 'success');
    this.closeConfirm();
    this.load();
  },
});
