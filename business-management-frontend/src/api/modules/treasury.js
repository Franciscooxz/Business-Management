import api from '../axios';

export const treasuryApi = {
  // ── Cuentas Bancarias ──────────────────────────────────────────────────────
  getBankAccounts:     (params)      => api.get('/treasury/bank-accounts', { params }),
  getBankAccount:      (id)          => api.get(`/treasury/bank-accounts/${id}`),
  createBankAccount:   (data)        => api.post('/treasury/bank-accounts', data),
  updateBankAccount:   (id, data)    => api.put(`/treasury/bank-accounts/${id}`, data),
  deleteBankAccount:   (id)          => api.delete(`/treasury/bank-accounts/${id}`),
  getBankMovements:    (id, params)  => api.get(`/treasury/bank-accounts/${id}/movements`, { params }),
  getBankSummary:      (id)          => api.get(`/treasury/bank-accounts/${id}/summary`),

  // ── Movimientos ────────────────────────────────────────────────────────────
  getMovements:        (params)      => api.get('/treasury/movements', { params }),
  getMovement:         (id)          => api.get(`/treasury/movements/${id}`),
  createMovement:      (data)        => api.post('/treasury/movements', data),
  reverseMovement:     (id, data)    => api.post(`/treasury/movements/${id}/reverse`, data),
  getMovementTypes:    ()            => api.get('/treasury/movements/types'),
  getCashFlow:         (params)      => api.get('/treasury/movements/cash-flow', { params }),

  // ── Cuentas por Cobrar ─────────────────────────────────────────────────────
  getReceivables:      (params)      => api.get('/treasury/accounts-receivable', { params }),
  getReceivable:       (id)          => api.get(`/treasury/accounts-receivable/${id}`),
  createReceivable:    (data)        => api.post('/treasury/accounts-receivable', data),
  payReceivable:       (id, data)    => api.post(`/treasury/accounts-receivable/${id}/pay`, data),
  getReceivableAging:  ()            => api.get('/treasury/accounts-receivable/aging'),

  // ── Cuentas por Pagar ──────────────────────────────────────────────────────
  getPayables:         (params)      => api.get('/treasury/accounts-payable', { params }),
  getPayable:          (id)          => api.get(`/treasury/accounts-payable/${id}`),
  createPayable:       (data)        => api.post('/treasury/accounts-payable', data),
  payPayable:          (id, data)    => api.post(`/treasury/accounts-payable/${id}/pay`, data),
  getPayableAging:     ()            => api.get('/treasury/accounts-payable/aging'),
};

export default treasuryApi;
