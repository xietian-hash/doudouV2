const { get } = require('./request');

module.exports = {
  getCategoryExpense: (month) => get('/api/statistics/category-expense', { month }),
};
