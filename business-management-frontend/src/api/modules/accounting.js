import api from '../axios';

export const accountingApi = {
  // ── PUC ──────────────────────────────────────────────────────────────────────
  getPucTree:        (params)    => api.get('/accounting/puc/tree', { params }),
  getPucList:        (params)    => api.get('/accounting/puc', { params }),
  getPucAccount:     (id)        => api.get(`/accounting/puc/${id}`),
  createPucAccount:  (data)      => api.post('/accounting/puc', data),
  updatePucAccount:  (id, data)  => api.put(`/accounting/puc/${id}`, data),
  deletePucAccount:  (id)        => api.delete(`/accounting/puc/${id}`),

  // ── Comprobantes ─────────────────────────────────────────────────────────────
  getVouchers:       (params)    => api.get('/accounting/vouchers', { params }),
  getVoucher:        (id)        => api.get(`/accounting/vouchers/${id}`),
  createVoucher:     (data)      => api.post('/accounting/vouchers', data),
  updateVoucher:     (id, data)  => api.put(`/accounting/vouchers/${id}`, data),
  deleteVoucher:     (id)        => api.delete(`/accounting/vouchers/${id}`),
  postVoucher:       (id)        => api.post(`/accounting/vouchers/${id}/post`),
  reverseVoucher:    (id, data)  => api.post(`/accounting/vouchers/${id}/reverse`, data),

  // ── Períodos ─────────────────────────────────────────────────────────────────
  getPeriods:        (params)    => api.get('/accounting/periods', { params }),
  getPeriod:         (id)        => api.get(`/accounting/periods/${id}`),
  createPeriod:      (data)      => api.post('/accounting/periods', data),
  closePeriod:       (id)        => api.post(`/accounting/periods/${id}/close`),

  // ── Centros de Costo ──────────────────────────────────────────────────────────
  getCostCenters:    (params)    => api.get('/accounting/cost-centers', { params }),
  createCostCenter:  (data)      => api.post('/accounting/cost-centers', data),
  updateCostCenter:  (id, data)  => api.put(`/accounting/cost-centers/${id}`, data),
  deleteCostCenter:  (id)        => api.delete(`/accounting/cost-centers/${id}`),

  // ── Reportes ─────────────────────────────────────────────────────────────────
  getTrialBalance:   (params)    => api.get('/accounting/reports/trial-balance', { params }),
  getBalanceSheet:   (params)    => api.get('/accounting/reports/balance-sheet', { params }),
  getIncomeStmt:     (params)    => api.get('/accounting/reports/income-statement', { params }),
};

export default accountingApi;
