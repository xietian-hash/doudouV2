function resolveBaseUrl() {
  try {
    const info = wx.getAccountInfoSync();
    return info.miniProgram.envVersion === 'develop'
      ? 'http://192.168.1.84:3000'
      : 'https://api-accounts.aitrealmaker.top';
  } catch (err) {
    return 'https://api-accounts.aitrealmaker.top';
  }
}

module.exports = {
  BASE_URL: resolveBaseUrl(),
};
