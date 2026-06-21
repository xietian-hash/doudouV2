const { get, post, patch, del } = require('./request');

module.exports = {
  getRecurringBills: () => get('/api/recurring-bills'),
  getRecurringBill: (id) => get(`/api/recurring-bills/${id}`),
  createRecurringBill: (data) => post('/api/recurring-bills', data),
  updateRecurringBill: (id, data) => patch(`/api/recurring-bills/${id}`, data),
  deleteRecurringBill: (id) => del(`/api/recurring-bills/${id}`),
  toggleRecurringBill: (id) => patch(`/api/recurring-bills/${id}/toggle`),
};
