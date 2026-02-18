import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, DollarSign, Receipt, X } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import { showSuccess, showError } from '../utils/toast';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Datos de la venta
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchCurrencies();
  }, []);

    const fetchCurrencies = async () => {
    try {
      const response = await api.get('/currencies');
      const activeCurrencies = response.data.data.filter(c => c.is_active);
      setCurrencies(activeCurrencies);
      
      // Establecer moneda base por defecto
      const baseCurrency = activeCurrencies.find(c => c.is_base);
      if (baseCurrency) {
        setSelectedCurrency(baseCurrency);
      }
    } catch (error) {
      console.error('Error al cargar monedas:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?per_page=100');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?per_page=100');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    }
  };

  // Agregar producto al carrito
  const addToCart = (product) => {
    if (product.stock <= 0) {
      showError('Producto sin stock');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        showError(`Stock máximo alcanzado (${product.stock})`);
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
        stock: product.stock,
      }]);
      showSuccess(`${product.name} agregado al carrito`);
    }
  };

  // Actualizar cantidad
  const updateQuantity = (productId, newQuantity) => {
    const item = cart.find(i => i.product_id === productId);
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > item.stock) {
      showError(`Stock máximo: ${item.stock}`);
      return;
    }

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  // Remover del carrito
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // Limpiar carrito
  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('¿Deseas limpiar el carrito?')) {
      setCart([]);
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setDiscount(0);
      setNotes('');
    }
  };

  // Calcular totales
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discount) / 100;
  const tax = 0; // Puedes agregar lógica de impuestos aquí
  const total = subtotal - discountAmount + tax;

  // Procesar venta
  const processSale = async () => {
    if (cart.length === 0) {
      showError('El carrito está vacío');
      return;
    }

    if (!selectedCustomer && !customerName.trim()) {
      showError('Ingresa el nombre del cliente');
      return;
    }

    try {
      setProcessing(true);

      const saleData = {
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer ? null : customerName,
        customer_email: selectedCustomer ? null : customerEmail || null,
        customer_phone: selectedCustomer ? null : customerPhone || null,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: discountAmount.toFixed(2),
        total: total.toFixed(2),
        payment_method: paymentMethod,
        currency_id: selectedCurrency?.id || null,
        notes: notes || null,
      };

      console.log('📤 Enviando venta:', saleData);

      const response = await api.post('/sales', saleData);
      
      console.log('✅ Venta creada:', response.data);

      showSuccess('¡Venta procesada exitosamente!');

      // Limpiar todo
      setCart([]);
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setDiscount(0);
      setNotes('');
      
      // Recargar productos para actualizar stock
      fetchProducts();
    } catch (error) {
      console.error('❌ Error al procesar venta:', error);
      showError(error.response?.data?.message || 'Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  // Filtrar productos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">Crea una nueva venta de forma rápida</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: PRODUCTOS */}
          <div className="lg:col-span-2 space-y-4">
            {/* Búsqueda de productos */}
            <div className="card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 text-base"
                />
              </div>
            </div>

            {/* Grid de productos */}
            <div className="card p-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No se encontraron productos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        product.stock <= 0
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-blue-500 hover:shadow-md active:scale-95'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1">
                          {product.name}
                        </h3>
                        {product.category && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md flex-shrink-0">
                            {product.category.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          ${parseFloat(product.price).toFixed(2)}
                        </span>
                        <span className={`text-xs font-medium ${
                          product.stock <= 5 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: CARRITO Y CHECKOUT */}
          <div className="space-y-4">
            {/* Carrito */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    {cart.length}
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Limpiar carrito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">El carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="ml-2 w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Información del cliente */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Cliente</h2>
              </div>

              <div className="space-y-3">
                {/* Selector de cliente existente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cliente Registrado
                  </label>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === parseInt(e.target.value));
                      setSelectedCustomer(customer || null);
                      if (customer) {
                        setCustomerName('');
                        setCustomerEmail('');
                        setCustomerPhone('');
                      }
                    }}
                    className="input text-sm"
                  >
                    <option value="">Cliente genérico</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campos para cliente nuevo */}
                {!selectedCustomer && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="input text-sm"
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="input text-sm"
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="input text-sm"
                        placeholder="+57 300 123 4567"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Detalles de pago */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Pago</h2>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  value={selectedCurrency?.id || ''}
                  onChange={(e) => {
                    const currency = currencies.find(c => c.id === parseInt(e.target.value));
                    setSelectedCurrency(currency);
                  }}
                  className="input text-sm"
                >
                  {currencies.map(currency => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.symbol} ({currency.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                {/* Descuento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="input text-sm"
                    placeholder="0"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="input text-sm resize-none"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
            </div>

            {/* Resumen y botón de pago */}
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCurrency?.symbol || '$'}{subtotal.toFixed(2)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Descuento ({discount}%):</span>
                    <span className="font-semibold text-red-600">
                      -{selectedCurrency?.symbol || '$'}{discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Impuestos:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCurrency?.symbol || '$'}{tax.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-blue-300 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {selectedCurrency?.symbol || '$'}{total.toFixed(2)}
                  </span>
                </div>
                {selectedCurrency && (
                  <p className="text-xs text-blue-700 text-center mt-2">
                    {selectedCurrency.code} ({selectedCurrency.name})
                  </p>
                )}
              </div>

              <button
                onClick={processSale}
                disabled={cart.length === 0 || processing}
                className="w-full btn btn-primary py-3 text-base"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Procesando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Procesar Venta
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </LayoutNew>
  );
}