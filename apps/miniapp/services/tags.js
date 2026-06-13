const { get, post, patch, del } = require('./request');

module.exports = {
  getTags: () => get('/api/tags'),
  createTag: (tag) => {
    const data = typeof tag === 'string' ? { name: tag } : tag;
    return post('/api/tags', data);
  },
  updateTag: (id, tag) => {
    const data = typeof tag === 'string' ? { name: tag } : tag;
    return patch(`/api/tags/${id}`, data);
  },
  deleteTag: (id) => del(`/api/tags/${id}`),
};
