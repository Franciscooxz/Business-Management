import api from '../axios';

export const electronicInvoiceApi = {
  // ── Facturas ────────────────────────────────────────────────────────────────
  getInvoices: (params) => api.get('/electronic-invoices/', { params }),
  getInvoice:  (id)     => api.get(`/electronic-invoices/${id}`),
  createInvoice: (data) => api.post('/electronic-invoices/', data),
  updateInvoice: (id, data) => api.put(`/electronic-invoices/${id}`, data),
  deleteInvoice: (id)   => api.delete(`/electronic-invoices/${id}`),
  getStats:      ()     => api.get('/electronic-invoices/stats'),

  // ── Acciones DIAN ───────────────────────────────────────────────────────────
  generateXml:  (id) => api.post(`/electronic-invoices/${id}/generate-xml`),
  send:         (id) => api.post(`/electronic-invoices/${id}/send`),
  checkStatus:  (id) => api.post(`/electronic-invoices/${id}/check-status`),
  cancel:       (id) => api.post(`/electronic-invoices/${id}/cancel`),
  downloadXml:  (id) => api.get(`/electronic-invoices/${id}/download-xml`, { responseType: 'blob' }),

  // ── Resoluciones ────────────────────────────────────────────────────────────
  getResolutions:    (params) => api.get('/dian/resolutions/', { params }),
  getResolution:     (id)     => api.get(`/dian/resolutions/${id}`),
  createResolution:  (data)   => api.post('/dian/resolutions/', data),
  updateResolution:  (id, data) => api.put(`/dian/resolutions/${id}`, data),
  deleteResolution:  (id)     => api.delete(`/dian/resolutions/${id}`),
  activateResolution:(id)     => api.post(`/dian/resolutions/${id}/activate`),
};
