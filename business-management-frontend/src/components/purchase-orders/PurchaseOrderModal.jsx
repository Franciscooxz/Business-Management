import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, ShoppingCart, Plus, Trash2, Search } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function PurchaseOrderModal({ suppliers, onClose }) {
  const [products, setProducts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      supplier_id: '',
      currency_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      tax: 0,
      shipping: 0,
      notes: '',
    }
  });

  const tax = watch('tax') || 0;
  const shipping = watch('shipping') || 0;

  useEffect(() => {
    fetchProducts();
    fetchCurrencies();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', { params: { per_page: 1000 } });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/currencies');
      setCurrencies(response.data.data.filter(c => c.is_active));
    } catch (error) {
      console.error('Error al cargar monedas:', error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedProducts.find(sp => sp.product_id === p.id)
  );

  const addProduct = (product) => {
    setSelectedProducts([
      ...selectedProducts,
      {
        product_id: product.id,
        product_name: product.name,
        quantity_ordered: 1,
        unit_cost: 0,
      }
    ]);
    setSearchTerm('');
    setShowProductSearch(false);
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateProduct = (productId, field, value) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.product_id === productId ? { ...p, [field]: parseFloat(value) || 0 } : p
    ));
  };

  const subtotal = selectedProducts.reduce((sum, p) => sum + (p.quantity_ordered * p.unit_cost), 0);
  const total = subtotal + parseFloat(tax) + parseFloat(shipping);

  const onSubmit = async (data) => {
    if (selectedProducts.length === 0) {
      showError('Debes agregar al menos un producto');
      return;
    }

    try {
      const payload = {
        ...data,
        items: selectedProducts,
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
      };

      await api.post('/purchase-orders', payload);
      showSuccess('Orden de compra creada correctamente');
      onClose();
    } catch (error) {
      showError('Error al crear la orden de compra');
      console.error('Error:', error.response?.data || error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-slide-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Nueva Orden de Compra</h2>
              <p className="text-sm text-gray-500 mt-1">Crea una orden para tu proveedor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Proveedor *
              </label>
              <select
                {...register('supplier_id', { required: 'El proveedor es requerido' })}
                className="input"
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="text-red-500 text-sm mt-1">{errors.supplier_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Moneda
              </label>
              <select {...register('currency_id')} className="input">
                <option value="">Moneda por defecto</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Orden *
              </label>
              <input
                type="date"
                {...register('order_date', { required: 'La fecha es requerida' })}
                className="input"
              />
              {errors.order_date && (
                <p className="text-red-500 text-sm mt-1">{errors.order_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha Entrega Esperada
              </label>
              <input
                type="date"
                {...register('expected_delivery_date')}
                className="input"
              />
            </div>
          </div>

          {/* Productos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                Productos *
              </label>
              <button
                type="button"
                onClick={() => setShowProductSearch(!showProductSearch)}
                className="btn btn-secondary text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Producto
              </button>
            </div>

            {/* Búsqueda de productos */}
            {showProductSearch && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {searchTerm ? 'No se encontraron productos' : 'Escribe para buscar'}
                    </p>
                  ) : (
                    filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="w-full text-left p-3 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 transition-colors"
                      >
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">Stock: {product.stock}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Lista de productos seleccionados */}
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No hay productos agregados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedProducts.map((item) => (
                  <div key={item.product_id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                      <button
                        type="button"
                        onClick={() => removeProduct(item.product_id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => updateProduct(item.product_id, 'quantity_ordered', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Costo Unitario
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateProduct(item.product_id, 'unit_cost', e.target.value)}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Subtotal
                        </label>
                        <input
                          type="text"
                          value={(item.quantity_ordered * item.unit_cost).toFixed(2)}
                          disabled
                          className="input text-sm bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Costos adicionales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Impuestos
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('tax')}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Envío
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('shipping')}
                className="input"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              {...register('notes')}
              className="input"
              rows="3"
              placeholder="Información adicional sobre la orden..."
            />
          </div>

          {/* Resumen */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              {parseFloat(tax) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Impuestos:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(tax).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(shipping) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Envío:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(shipping).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-blue-300 my-2"></div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedProducts.length === 0}
              className="flex-1 btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creando...
                </span>
              ) : (
                'Crear Orden'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}