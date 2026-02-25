import api from '../axios';

export const adminApi = {
  // ── Estadísticas globales ──────────────────────────────────────────────────
  getStats: () => api.get('/admin/stats'),

  // ── Empresas ──────────────────────────────────────────────────────────────
  getCompanies:   (params)     => api.get('/admin/companies', { params }),
  getCompany:     (id)         => api.get(`/admin/companies/${id}`),
  createCompany:  (data)       => api.post('/admin/companies', data),
  updateCompany:  (id, data)   => api.put(`/admin/companies/${id}`, data),
  toggleActive:   (id)         => api.post(`/admin/companies/${id}/toggle-active`),
  deleteCompany:  (id)         => api.delete(`/admin/companies/${id}`),

  // ── Usuarios globales ──────────────────────────────────────────────────────
  getUsers:       (params)     => api.get('/admin/users', { params }),
  getUser:        (id)         => api.get(`/admin/users/${id}`),
  createUser:     (data)       => api.post('/admin/users', data),
  updateUser:     (id, data)   => api.put(`/admin/users/${id}`, data),
  deleteUser:     (id)         => api.delete(`/admin/users/${id}`),
};

export default adminApi;
