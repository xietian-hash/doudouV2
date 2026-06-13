const TAB_LIST = [
  '/pages/record/index',
  '/pages/bill/index',
  '/pages/mine/index',
];
const CANCEL_THRESHOLD_PX = 60;
const LONG_PRESS_THRESHOLD_MS = 300;

Component({
  data: {
    selected: 0,
    hidden: false,
    shellClass: 'tab-shell',
    recordItemClass: 'tab-item tab-item--active',
    mineItemClass: 'tab-item',
    fabClass: 'tab-fab',
    showVoiceIcon: false,
  },

  methods: {
    buildViewState(selected = this.data.selected, hidden = this.data.hidden) {
      return {
        selected,
        hidden: Boolean(hidden),
        shellClass: `tab-shell${hidden ? ' tab-shell--hidden' : ''}`,
        recordItemClass: `tab-item${selected === 0 ? ' tab-item--active' : ''}`,
        mineItemClass: `tab-item${selected === 2 ? ' tab-item--active' : ''}`,
        fabClass: `tab-fab${selected === 1 ? ' tab-fab--mic' : ''}`,
        showVoiceIcon: selected === 1,
      };
    },

    setSelected(index) {
      this.setData(this.buildViewState(index, this.data.hidden));
    },

    setHidden(hidden) {
      this.setData(this.buildViewState(this.data.selected, hidden));
    },

    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      if (this._blockNextTap) {
        this._blockNextTap = false;
        return;
      }
      const url = TAB_LIST[index];
      if (!url || index === this.data.selected) return;
      wx.switchTab({ url });
    },

    handleFabTouchStart(event) {
      if (this.data.selected !== 0 && this.data.selected !== 1) return;
      const touch = (event.touches && event.touches[0]) || {};
      this._voiceTouchStartAt = Date.now();
      this._voiceTouchStartY = typeof touch.clientY === 'number' ? touch.clientY : 0;
      this._voiceCanceling = false;
      this._voiceRecordingActive = false;
      if (this._voiceLongPressTimer) clearTimeout(this._voiceLongPressTimer);
      this._voiceLongPressTimer = setTimeout(() => {
        this._voiceLongPressTimer = null;
        if (!this._voiceTouchStartAt) return;
        this._voiceRecordingActive = true;
        wx.$emit && wx.$emit('voiceRecord:start');
      }, LONG_PRESS_THRESHOLD_MS);
    },

    handleFabTouchMove(event) {
      if (this.data.selected !== 0 && this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      if (!this._voiceRecordingActive) return;
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
      if (this.data.selected !== 0 && this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      const duration = Date.now() - this._voiceTouchStartAt;
      const canceled = Boolean(this._voiceCanceling);
      const recordingActive = Boolean(this._voiceRecordingActive);
      if (this._voiceLongPressTimer) {
        clearTimeout(this._voiceLongPressTimer);
        this._voiceLongPressTimer = null;
      }
      this._voiceTouchStartAt = 0;
      this._voiceCanceling = false;
      this._voiceRecordingActive = false;
      if (!recordingActive) return;
      this._blockNextTap = true;
      wx.$emit && wx.$emit('voiceRecord:stop', { duration, canceled });
    },

    handleFabTouchCancel() {
      if (this.data.selected !== 0 && this.data.selected !== 1) return;
      if (!this._voiceTouchStartAt) return;
      const duration = Date.now() - this._voiceTouchStartAt;
      const recordingActive = Boolean(this._voiceRecordingActive);
      if (this._voiceLongPressTimer) {
        clearTimeout(this._voiceLongPressTimer);
        this._voiceLongPressTimer = null;
      }
      this._voiceTouchStartAt = 0;
      this._voiceCanceling = false;
      this._voiceRecordingActive = false;
      if (!recordingActive) return;
      this._blockNextTap = true;
      wx.$emit && wx.$emit('voiceRecord:stop', { duration, canceled: true });
    },
  },
});
