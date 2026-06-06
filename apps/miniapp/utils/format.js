function formatAmount(value) {
  const num = Number(value || 0);
  return num.toFixed(2);
}

function toMoneyInput(value) {
  if (!value || value === '0') return '0';
  return String(value).replace(/^0+(\d)/, '$1');
}

module.exports = {
  formatAmount,
  toMoneyInput,
};
