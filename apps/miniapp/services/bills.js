const { get, post, patch, del } = require('./request');

module.exports = {
  getBills: (params) => get('/api/bills', params),
  getCalendarSummary: (month) => get('/api/bills/calendar-summary', { month }),
  getBillDetail: (id) => get(`/api/bills/${id}`),
  createBill: (data) => post('/api/bills', data),
  createBillBatch: (items) => post('/api/bills/batch', { bills: items }),
  updateBill: (id, data) => patch(`/api/bills/${id}`, data),
  deleteBill: (id) => del(`/api/bills/${id}`),
};
