const { get } = require('../../services/request');

function buildOverviewQuery(params) {
  const q = { period: params.period, level: params.level, type: params.type };
  if (params.period === 'month') q.month = params.month;
  if (params.period === 'year') q.year = params.year;
  return q;
}

module.exports = {
  // 旧接口：保留供历史调用方
  getCategoryExpense: (month) => get('/api/statistics/category-expense', { month }),

  getOverview: (params) => get('/api/statistics/overview', buildOverviewQuery(params)),

  getCategoryTrend: ({ level, type }) =>
    get('/api/statistics/category-trend', { level, type }),

  getDailySeries: (params) => {
    const q = { period: params.period, type: params.type };
    if (params.period === 'month') q.month = params.month;
    if (params.period === 'year') q.year = params.year;
    return get('/api/statistics/daily-series', q);
  },

  getTopBills: (params) => {
    const q = { period: params.period, type: params.type, limit: params.limit || 5 };
    if (params.period === 'month') q.month = params.month;
    if (params.period === 'year') q.year = params.year;
    return get('/api/statistics/top-bills', q);
  },
};
