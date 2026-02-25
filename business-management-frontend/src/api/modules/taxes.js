import api from '../axios';

export const taxesApi = {
  // ── Conceptos tributarios ─────────────────────────────────────────────────
  getConcepts:     (params)      => api.get('/taxes/concepts', { params }),
  createConcept:   (data)        => api.post('/taxes/concepts', data),
  updateConcept:   (id, data)    => api.put(`/taxes/concepts/${id}`, data),
  deleteConcept:   (id)          => api.delete(`/taxes/concepts/${id}`),

  // ── Retenciones ───────────────────────────────────────────────────────────
  getWithholding:       (params)           => api.get('/taxes/withholding', { params }),
  createWithholding:    (data)             => api.post('/taxes/withholding', data),
  updateWithholding:    (id, data)         => api.put(`/taxes/withholding/${id}`, data),
  deleteWithholding:    (id)               => api.delete(`/taxes/withholding/${id}`),
  getWithholdingSummary:(params)           => api.get('/taxes/withholding/summary', { params }),
  getCertificate:       (thirdPartyId, yr) => api.get(`/taxes/withholding/certificate/${thirdPartyId}`, { params: { year: yr } }),
  getExogenous:         (params)           => api.get('/taxes/withholding/exogenous', { params }),

  // ── Declaraciones ─────────────────────────────────────────────────────────
  getDeclarations:      (params) => api.get('/taxes/declarations', { params }),
  getDeclaration:       (id)     => api.get(`/taxes/declarations/${id}`),
  createDeclaration:    (data)   => api.post('/taxes/declarations', data),
  calculateDeclaration: (id)     => api.post(`/taxes/declarations/${id}/calculate`),
  presentDeclaration:   (id)     => api.post(`/taxes/declarations/${id}/present`),
  payDeclaration:       (id)     => api.post(`/taxes/declarations/${id}/pay`),
};
