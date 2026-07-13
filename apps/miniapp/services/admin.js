const { get } = require('./request');

module.exports = {
  getUserStats: () => get('/api/admin/user-stats'),
};
