const TAB_LIST = [
  '/pages/record/index',
  '/pages/bill/index',
  '/pages/mine/index',
];
const CANCEL_THRESHOLD_PX = 60;

Component({
  data: {
    selected: 0,
    hidden: false,
  },

  methods: {
    setSelected(index) {
      this.setData({ selected: index });
    },

    setHidden(hidden) {
      this.setData({ hidden: Boolean(hidden) });
    },

    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const url = TAB_LIST[index];
      if (!url || index === this.data.selected) return;
      wx.switchTab({ url });
    },

    handleFabTouchStart(event) {
      if (this.data.selected !== 1) return;
      const touch = (event.touches && event.touches[0]) || {};
      this._voiceTouchStartAt = Date.now();
      this._voiceTouchStartY = typeof touch.clientY === 'number' ? touch.clientY : 0;
      this._voiceCanceling = false;
      wx.$emit && wx.$emit('voiceRecord:start');
    },

    handleFabTouchMove(event) {
      if (this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      const touch = (event.touches && event.touches[0]) || {};
      const currentY = typeof touch.clientY === 'number' ? touch.clientY : this._voiceTouchStartY;
      const deltaY = currentY - this._voiceTouchStartY;
      const canceling = deltaY < -CANCEL_THRESHOLD_PX;
      if (canceling !== this._voiceCanceling) {
        this._voiceCanceling = canceling;
        wx.$emit && wx.$emit('voiceRecord:move', { canceling });
      }
    },

    handleFabTouchEnd() {
      if (this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      const duration = Date.now() - this._voiceTouchStartAt;
      const canceled = Boolean(this._voiceCanceling);
      this._voiceTouchStartAt = 0;
      this._voiceCanceling = false;
      wx.$emit && wx.$emit('voiceRecord:stop', { duration, canceled });
    },

    handleFabTouchCancel() {
      if (this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      const duration = Date.now() - this._voiceTouchStartAt;
      this._voiceTouchStartAt = 0;
      this._voiceCanceling = false;
      wx.$emit && wx.$emit('voiceRecord:stop', { duration, canceled: true });
    },
  },
});
