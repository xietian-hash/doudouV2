const { get } = require('../../services/request');

module.exports = {
  getUserStats: () => get('/api/admin/user-stats'),
};
