const { get, post, patch, del } = require('./request');

module.exports = {
  getCategories: (params) => get('/api/categories', params),
  getCategoryIcons: () => get('/api/category-icons'),
  createCategory: (data) => post('/api/categories', data),
  updateCategory: (id, data) => patch(`/api/categories/${id}`, data),
  deleteCategory: (id) => del(`/api/categories/${id}`),
};
