import api from '../axios';

export const thirdPartiesApi = {
  getAll: (params) => api.get('/third-parties', { params }),
  search: (q) => api.get('/third-parties/search', { params: { q } }),
  getOne: (id) => api.get(`/third-parties/${id}`),
  create: (data) => api.post('/third-parties', data),
  update: (id, data) => api.put(`/third-parties/${id}`, data),
  remove: (id) => api.delete(`/third-parties/${id}`),
};

export default thirdPartiesApi;
