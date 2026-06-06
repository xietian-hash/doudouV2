const { get, post, patch, del } = require('./request');

module.exports = {
  getTags: () => get('/api/tags'),
  createTag: (name) => post('/api/tags', { name }),
  updateTag: (id, name) => patch(`/api/tags/${id}`, { name }),
  deleteTag: (id) => del(`/api/tags/${id}`),
};
