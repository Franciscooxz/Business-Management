import api from '../axios';

export const reportsApi = {
  getTrialBalance:    (params) => api.get('/reports/trial-balance',    { params }),
  getBalanceSheet:    (params) => api.get('/reports/balance-sheet',    { params }),
  getIncomeStatement: (params) => api.get('/reports/income-statement', { params }),
  getGeneralLedger:   (params) => api.get('/reports/general-ledger',   { params }),
  getJournal:         (params) => api.get('/reports/journal',          { params }),
  getFinancialRatios: (params) => api.get('/reports/financial-ratios', { params }),
};
