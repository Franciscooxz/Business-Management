import api from '../axios';

export const accountingApi = {
  // PUC
  getPucTree: (params) => api.get('/accounting/puc/tree', { params }),
  getPucList: (params) => api.get('/accounting/puc', { params }),
  createPucAccount: (data) => api.post('/accounting/puc', data),
  updatePucAccount: (id, data) => api.put(`/accounting/puc/${id}`, data),

  // Comprobantes
  getVouchers: (params) => api.get('/accounting/vouchers', { params }),
  getVoucher: (id) => api.get(`/accounting/vouchers/${id}`),
  createVoucher: (data) => api.post('/accounting/vouchers', data),
  postVoucher: (id) => api.post(`/accounting/vouchers/${id}/post`),
  reverseVoucher: (id, data) => api.post(`/accounting/vouchers/${id}/reverse`, data),
};

export default accountingApi;
