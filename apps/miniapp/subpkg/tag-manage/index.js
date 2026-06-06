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

function normalizeTag(item, index) {
  return {
    ...item,
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
    const diff = event.changedTouches[0].clientX - this._touchStartX;
    let next = this._touchStartSlideX + diff;
    if (next > 0) next = 0;
    if (next < -288) next = -288;
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
    const target = startSlide === -288 ? (moved > 96 ? 0 : -288) : (moved < -96 ? -288 : 0);
    if (current === target) return;
    const tags = this.data.tags.map((item, i) => (i === index ? { ...item, slideX: target } : item));
    this.setData({ tags });
  },

  openCreate() {
    this.closeSwipeRows();
    this.setData({ dialogVisible: true, editingId: '', name: '' });
  },

  openEdit(event) {
    this.closeSwipeRows();
    this.setData({
      dialogVisible: true,
      editingId: event.currentTarget.dataset.id,
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
    await service.deleteTag(this.data.pendingDeleteId);
    showToast('删除成功', 'success');
    this.closeConfirm();
    this.load();
  },
});
