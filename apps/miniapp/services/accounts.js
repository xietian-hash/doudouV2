const { get, post, patch, del } = require('./request');

module.exports = {
  getAccounts: () => get('/api/accounts'),
  createAccount: (data) => post('/api/accounts', data),
  updateAccount: (id, data) => patch(`/api/accounts/${id}`, data),
  deleteAccount: (id) => del(`/api/accounts/${id}`),
  setDefaultAccount: (id) => post(`/api/accounts/${id}/default`),
};
