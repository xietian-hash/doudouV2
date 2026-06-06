const TAB_LIST = [
  '/pages/record/index',
  '/pages/bill/index',
  '/pages/mine/index',
];

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

    handleFabTouchStart() {
      if (this.data.selected !== 1) return;
      wx.$emit && wx.$emit('voiceRecord:start');
    },

    handleFabTouchEnd() {
      if (this.data.selected !== 1) return;
      wx.$emit && wx.$emit('voiceRecord:stop');
    },
  },
});
