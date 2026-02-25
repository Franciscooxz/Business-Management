import api from '../axios';

export const payrollApi = {
  // ── Constantes ─────────────────────────────────────────────────────────────
  getConstants:      ()             => api.get('/payroll/constants'),

  // ── Empleados ──────────────────────────────────────────────────────────────
  getEmployees:      (params)       => api.get('/payroll/employees', { params }),
  getEmployee:       (id)           => api.get(`/payroll/employees/${id}`),
  createEmployee:    (data)         => api.post('/payroll/employees', data),
  updateEmployee:    (id, data)     => api.put(`/payroll/employees/${id}`, data),
  deleteEmployee:    (id)           => api.delete(`/payroll/employees/${id}`),

  // ── Períodos ───────────────────────────────────────────────────────────────
  getPeriods:        (params)       => api.get('/payroll/periods', { params }),
  getPeriod:         (id)           => api.get(`/payroll/periods/${id}`),
  createPeriod:      (data)         => api.post('/payroll/periods', data),
  calculatePeriod:   (id, data)     => api.post(`/payroll/periods/${id}/calculate`, data),
  updateItem:        (periodId, itemId, data) =>
                                        api.patch(`/payroll/periods/${periodId}/items/${itemId}`, data),
  cancelPeriod:      (id)           => api.post(`/payroll/periods/${id}/cancel`),

  // ── Configuración (SMMLV por año) ──────────────────────────────────────────
  getSettings:       ()             => api.get('/payroll/settings'),
  createSetting:     (data)         => api.post('/payroll/settings', data),
  updateSetting:     (id, data)     => api.put(`/payroll/settings/${id}`, data),
  activateSetting:   (id)           => api.post(`/payroll/settings/${id}/activate`),
  deleteSetting:     (id)           => api.delete(`/payroll/settings/${id}`),
};

export default payrollApi;
