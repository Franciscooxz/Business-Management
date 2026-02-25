import { useState, useEffect } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User,
  DollarSign, Receipt, X, FileText, CheckCircle, AlertTriangle,
} from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import { showSuccess, showError } from '../utils/toast';

export default function POS() {
  const [products, setProducts]       = useState([]);
  const [customers, setCustomers]     = useState([]);
  const [currencies, setCurrencies]   = useState([]);
  const [thirdParties, setThirdParties] = useState([]);
  const [cart, setCart]               = useState([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [processing, setProcessing]   = useState(false);

  // Datos de la venta
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [selectedCurrency, setSelectedCurrency]   = useState(null);
  const [selectedThirdParty, setSelectedThirdParty] = useState(null);
  const [customerName, setCustomerName]           = useState('');
  const [customerEmail, setCustomerEmail]         = useState('');
  const [customerPhone, setCustomerPhone]         = useState('');
  const [paymentMethod, setPaymentMethod]         = useState('efectivo');
  const [discount, setDiscount]                   = useState(0);
  const [notes, setNotes]                         = useState('');

  // Factura electrónica DIAN
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [lastInvoice, setLastInvoice]         = useState(null); // { full_number, status } | { error }

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchCurrencies();
    fetchThirdParties();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/currencies');
      const active = response.data.data.filter((c) => c.is_active);
      setCurrencies(active);
      const base = active.find((c) => c.is_base);
      if (base) setSelectedCurrency(base);
    } catch {
      // silencioso
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products?per_page=100');
      setProducts(response.data.data);
    } catch {
      showError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers?per_page=100');
      setCustomers(response.data.data);
    } catch {
      // silencioso
    }
  };

  const fetchThirdParties = async () => {
    try {
      const response = await api.get('/third-parties?per_page=200&is_active=1');
      setThirdParties(response.data.data ?? []);
    } catch {
      // silencioso — no todos los planes tienen terceros ERP
    }
  };

  // ── Carrito ─────────────────────────────────────────────────────────────

  const addToCart = (product) => {
    if (product.stock <= 0) { showError('Producto sin stock'); return; }

    const existing = cart.find((i) => i.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        showError(`Stock máximo alcanzado (${product.stock})`);
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setCart([...cart, {
        product_id: product.id,
        name:       product.name,
        price:      parseFloat(product.price),
        quantity:   1,
        stock:      product.stock,
      }]);
      showSuccess(`${product.name} agregado al carrito`);
    }
  };

  const updateQuantity = (productId, newQty) => {
    const item = cart.find((i) => i.product_id === productId);
    if (newQty <= 0)         { removeFromCart(productId); return; }
    if (newQty > item.stock) { showError(`Stock máximo: ${item.stock}`); return; }
    setCart(cart.map((i) => i.product_id === productId ? { ...i, quantity: newQty } : i));
  };

  const removeFromCart = (productId) => setCart(cart.filter((i) => i.product_id !== productId));

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('¿Deseas limpiar el carrito?')) {
      resetForm();
    }
  };

  const resetForm = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedThirdParty(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setDiscount(0);
    setNotes('');
    setLastInvoice(null);
  };

  // ── Totales ─────────────────────────────────────────────────────────────

  const subtotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const tax            = 0;
  const total          = subtotal - discountAmount + tax;

  // ── Procesar venta ───────────────────────────────────────────────────────

  const processSale = async () => {
    if (cart.length === 0)                       { showError('El carrito está vacío'); return; }
    if (!selectedCustomer && !customerName.trim()) { showError('Ingresa el nombre del cliente'); return; }
    if (generateInvoice && !selectedThirdParty)  { showError('Selecciona el tercero (NIT/cédula) para generar la factura DIAN'); return; }

    try {
      setProcessing(true);
      setLastInvoice(null);

      const saleData = {
        customer_id:      selectedCustomer?.id   ?? null,
        customer_name:    selectedCustomer ? null : customerName,
        customer_email:   selectedCustomer ? null : customerEmail  || null,
        customer_phone:   selectedCustomer ? null : customerPhone  || null,
        third_party_id:   selectedThirdParty?.id ?? null,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity:   item.quantity,
          price:      item.price,
        })),
        subtotal:       subtotal.toFixed(2),
        tax:            tax.toFixed(2),
        discount:       discountAmount.toFixed(2),
        total:          total.toFixed(2),
        payment_method: paymentMethod,
        currency_id:    selectedCurrency?.id ?? null,
        notes:          notes || null,
        generate_invoice: generateInvoice,
      };

      const response = await api.post('/sales', saleData);
      const invoiceInfo = response.data?.invoice ?? null;

      if (invoiceInfo) {
        setLastInvoice(invoiceInfo);
        if (invoiceInfo.error) {
          showError(`Venta creada, pero la factura DIAN falló: ${invoiceInfo.error}`);
        } else {
          showSuccess(`Venta y factura ${invoiceInfo.full_number} creadas correctamente`);
        }
      } else {
        showSuccess('¡Venta procesada exitosamente!');
      }

      // Limpiar carrito (mantenemos lastInvoice para mostrarlo)
      setCart([]);
      setSelectedCustomer(null);
      setSelectedThirdParty(null);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setDiscount(0);
      setNotes('');
      fetchProducts();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al procesar la venta');
    } finally {
      setProcessing(false);
    }
  };

  // ── Filtrar productos ────────────────────────────────────────────────────

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">Crea una nueva venta de forma rápida</p>
        </div>

        {/* Alerta de factura generada */}
        {lastInvoice && !lastInvoice.error && (
          <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Factura electrónica creada en borrador
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                {lastInvoice.message ?? `Número: ${lastInvoice.full_number}`} — Revísala en{' '}
                <a href="/electronic-invoice" className="underline font-medium">Facturación Electrónica</a>{' '}
                antes de enviar a DIAN.
              </p>
            </div>
            <button onClick={() => setLastInvoice(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {lastInvoice?.error && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Venta creada — la factura DIAN no se pudo generar
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{lastInvoice.error}</p>
            </div>
            <button onClick={() => setLastInvoice(null)} className="text-amber-500 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── IZQUIERDA: PRODUCTOS ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10 text-base"
                />
              </div>
            </div>

            <div className="card p-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-md shrink-0">
                            {product.category.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-600">
                          ${parseFloat(product.price).toFixed(2)}
                        </span>
                        <span className={`text-xs font-medium ${product.stock <= 5 ? 'text-red-600' : 'text-gray-500'}`}>
                          Stock: {product.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── DERECHA: CARRITO Y CHECKOUT ── */}
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
                  <button onClick={clearCart} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Limpiar carrito">
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
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.product_id)} className="ml-2 w-7 h-7 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cliente */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Cliente</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente Registrado</label>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const c = customers.find((c) => c.id === parseInt(e.target.value));
                      setSelectedCustomer(c || null);
                      if (c) { setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); }
                    }}
                    className="input text-sm"
                  >
                    <option value="">Cliente genérico</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {!selectedCustomer && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                      <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input text-sm" placeholder="Nombre del cliente" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input text-sm" placeholder="email@ejemplo.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                      <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input text-sm" placeholder="+57 300 123 4567" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pago */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-bold text-gray-900">Pago</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
                  <select
                    value={selectedCurrency?.id || ''}
                    onChange={(e) => setSelectedCurrency(currencies.find((c) => c.id === parseInt(e.target.value)))}
                    className="input text-sm"
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} - {c.symbol} ({c.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input text-sm">
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descuento (%)</label>
                  <input
                    type="number" min="0" max="100" value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="input text-sm" placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notas</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input text-sm resize-none" placeholder="Notas adicionales..." />
                </div>
              </div>
            </div>

            {/* ── Factura Electrónica DIAN ── */}
            <div className="card border-2 border-dashed border-indigo-200 dark:border-indigo-800">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Generar Factura DIAN</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Crea borrador de factura electrónica</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setGenerateInvoice((v) => !v); setSelectedThirdParty(null); }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    generateInvoice ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={generateInvoice}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition duration-200 ease-in-out ${
                      generateInvoice ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Selector de Tercero (visible cuando toggle está on) */}
              {generateInvoice && (
                <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Comprador (NIT / Cédula) *
                  </label>
                  <select
                    value={selectedThirdParty?.id || ''}
                    onChange={(e) => {
                      const tp = thirdParties.find((t) => t.id === parseInt(e.target.value));
                      setSelectedThirdParty(tp || null);
                    }}
                    className="input text-sm"
                  >
                    <option value="">— Seleccionar tercero —</option>
                    {thirdParties.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.display_name ?? tp.business_name ?? tp.first_name} — {tp.document_number}
                      </option>
                    ))}
                  </select>
                  {thirdParties.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      No hay terceros registrados. Créalos en{' '}
                      <a href="/third-parties" className="underline">Terceros</a>.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    La factura se creará en borrador. Debes enviarla a DIAN desde Facturación Electrónica.
                  </p>
                </div>
              )}
            </div>

            {/* Resumen y botón */}
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10 border-2 border-blue-200 dark:border-blue-800">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedCurrency?.symbol || '$'}{subtotal.toFixed(2)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Descuento ({discount}%):</span>
                    <span className="font-semibold text-red-600">
                      -{selectedCurrency?.symbol || '$'}{discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Impuestos:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedCurrency?.symbol || '$'}{tax.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-blue-300 dark:bg-blue-700 my-2" />
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">TOTAL:</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedCurrency?.symbol || '$'}{total.toFixed(2)}
                  </span>
                </div>
                {selectedCurrency && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 text-center mt-2">
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Receipt className="w-5 h-5" />
                    {generateInvoice ? 'Procesar y Facturar' : 'Procesar Venta'}
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
