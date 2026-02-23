import api from '../axios';

export const inventoryApi = {
  // ── Kardex ────────────────────────────────────────────────────────────────────
  getKardex:       (productId, params) => api.get(`/inventory/kardex/${productId}`, { params }),

  // ── Movimientos ───────────────────────────────────────────────────────────────
  getMovements:    (params)   => api.get('/inventory/movements', { params }),
  createMovement:  (data)     => api.post('/inventory/movements', data),
  getMovementTypes:()         => api.get('/inventory/movements/types'),

  // ── Alertas ───────────────────────────────────────────────────────────────────
  getStockAlerts:  ()         => api.get('/inventory/stock-alerts'),

  // ── Productos (re-export para uso en inventario) ───────────────────────────────
  getProducts:     (params)   => api.get('/products', { params }),
  getProduct:      (id)       => api.get(`/products/${id}`),
  createProduct:   (data)     => api.post('/products', data),
  updateProduct:   (id, data) => api.put(`/products/${id}`, data),
  deleteProduct:   (id)       => api.delete(`/products/${id}`),
};

export default inventoryApi;
