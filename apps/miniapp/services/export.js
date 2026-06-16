const { post } = require('./request');

function exportBills(email) {
  return post('/api/export/bills', { email });
}

module.exports = { exportBills };
