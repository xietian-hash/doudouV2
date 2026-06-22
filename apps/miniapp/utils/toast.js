function showToast(title, icon) {
  wx.showToast({
    title,
    icon: icon === 'success' ? 'success' : 'none',
    duration: 1500,
  });
}

function showError(title) {
  showToast(title || '操作失败，请重试', 'error');
}

module.exports = {
  showToast,
  showError,
};
