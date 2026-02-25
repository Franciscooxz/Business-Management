import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, X, Package, TrendingDown, TrendingUp, AlertTriangle,
  ChevronDown, Plus, FileText, RefreshCw,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { inventoryApi } from '../../api/modules/inventory';
import { showError } from '../../utils/toast';
import StockAdjustmentModal from './StockAdjustmentModal';

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmtCOP(n, decimals = 0) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: decimals,
  }).format(Number(n));
}

function fmtQty(n) {
  if (n == null) return '—';
  const num = Number(n);
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const METHOD_LABELS = {
  promedio_ponderado: 'Promedio Ponderado',
  peps:  'PEPS (FIFO)',
  ueps:  'UEPS (LIFO)',
};

const TYPE_CONFIG = {
  inicial:           { label: 'Inv. Inicial',        color: 'text-gray-500',   dir: 'E' },
  compra:            { label: 'Compra',               color: 'text-blue-600',   dir: 'E' },
  venta:             { label: 'Venta',                color: 'text-red-600',    dir: 'S' },
  devolucion_compra: { label: 'Dev. Proveedor',       color: 'text-orange-600', dir: 'S' },
  devolucion_venta:  { label: 'Dev. Cliente',         color: 'text-blue-500',   dir: 'E' },
  traslado:          { label: 'Traslado',             color: 'text-purple-600', dir: 'E' },
  ajuste:            { label: 'Ajuste',               color: 'text-amber-600',  dir: 'A' },
  entrada:           { label: 'Entrada Manual',       color: 'text-emerald-600',dir: 'E' },
  salida:            { label: 'Salida Manual',        color: 'text-rose-600',   dir: 'S' },
};

// ─── Selector de producto async ──────────────────────────────────────────────
function ProductSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.getProducts({ search: query, per_page: 15 });
        setResults(res.data.data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre o SKU..."
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
        />
        {loading && <div className="w-4 h-4 border border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />}
      </div>
      {results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => { onSelect(p); setQuery(''); setResults([]); }}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
            >
              <Package className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-400">{p.sku ?? 'Sin SKU'} · Stock: {p.stock}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                p.stock <= 0 ? 'bg-red-100 text-red-600' :
                p.stock <= (p.min_stock || 5) ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {p.stock}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────────
export default function Kardex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProductId = searchParams.get('product_id');

  const [product, setProduct] = useState(null);
  const [kardexData, setKardexData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchKardex = useCallback(async (productId, filters = {}) => {
    if (!productId) return;
    setLoading(true);
    try {
      const params = {};
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo)   params.date_to   = filters.dateTo;
      if (filters.type)     params.type       = filters.type;

      const res = await inventoryApi.getKardex(productId, params);
      const data = res.data.data;
      setProduct(data.product);
      setKardexData(data);
    } catch {
      showError('Error al cargar el Kardex');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga automática si viene product_id en URL
  useEffect(() => {
    if (initialProductId) {
      fetchKardex(initialProductId, { dateFrom, dateTo, type: typeFilter });
    }
  }, [initialProductId, fetchKardex]);

  const handleSelectProduct = (p) => {
    setSearchParams({ product_id: p.id });
    fetchKardex(p.id, { dateFrom, dateTo, type: typeFilter });
  };

  const handleFilter = () => {
    if (product) {
      fetchKardex(product.id, { dateFrom, dateTo, type: typeFilter });
    }
  };

  const movements = kardexData?.movements ?? [];
  const summary   = kardexData?.summary ?? {};
  const opening   = kardexData ? {
    qty: kardexData.opening_qty,
    value: kardexData.opening_value,
    avgCost: kardexData.opening_avg_cost,
  } : null;

  return (
    <LayoutNew>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Kardex</h1>
            <p className="page-subtitle">Tarjeta de inventario permanente — saldos corridos</p>
          </div>
          {product && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Ajuste Manual
            </button>
          )}
        </div>

        {/* ── Buscador de producto ─────────────────────────────────────────── */}
        <div className="card space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Seleccionar Producto
          </p>
          <ProductSearch onSelect={handleSelectProduct} />
          {product && (
            <div className="flex items-center gap-3 p-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <Package className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {product.sku ?? 'Sin SKU'} · {product.category ?? '—'} ·{' '}
                  <span className="font-medium">{METHOD_LABELS[product.costing_method] ?? product.costing_method}</span>
                </p>
              </div>
              <button
                onClick={() => { setProduct(null); setKardexData(null); setSearchParams({}); }}
                className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded"
              >
                <X className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              </button>
            </div>
          )}

          {/* Filtros de fecha */}
          {product && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Desde</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input h-8 text-xs w-36" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Hasta</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input h-8 text-xs w-36" />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">Tipo</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input h-8 text-xs w-36">
                  <option value="">Todos</option>
                  {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-1">
                <button onClick={handleFilter} className="btn btn-primary h-8 text-xs px-3">
                  <RefreshCw className="w-3 h-3" /> Aplicar
                </button>
                {(dateFrom || dateTo || typeFilter) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); setTypeFilter(''); fetchKardex(product.id); }} className="btn btn-secondary h-8 text-xs px-3">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Métricas del producto ────────────────────────────────────────── */}
        {product && !loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Stock Actual',
                value: fmtQty(product.stock),
                sub: product.unit_of_measure ?? 'UND',
                icon: Package,
                color: product.stock <= 0
                  ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                  : product.stock <= (product.min_stock || 5)
                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
              },
              {
                label: 'Costo Unitario',
                value: fmtCOP(product.avg_cost, 2),
                sub: METHOD_LABELS[product.costing_method],
                icon: FileText,
                color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
              },
              {
                label: 'Valor Inventario',
                value: fmtCOP(product.inventory_value ?? product.stock * product.avg_cost),
                sub: 'Al costo',
                icon: TrendingUp,
                color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
              },
              {
                label: 'Total Entradas',
                value: fmtQty(summary.total_entry_qty),
                sub: fmtCOP(summary.total_entry_value),
                icon: TrendingUp,
                color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="card flex items-start gap-3 py-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tarjeta Kardex ───────────────────────────────────────────────── */}
        {!product && !loading && (
          <div className="card py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Selecciona un producto
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Busca el producto en el campo de arriba para ver su tarjeta Kardex
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {product && !loading && kardexData && (
          <div className="card overflow-hidden p-0">
            {/* Cabecera de la tarjeta */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Tarjeta Kardex
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {product.name}
                    {product.sku && <span className="ml-2 font-mono text-xs text-gray-400">[{product.sku}]</span>}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium">
                  {METHOD_LABELS[kardexData.costing_method]}
                </span>
              </div>
            </div>

            {/* Tabla Kardex — formato colombiano */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide" rowSpan={2}>Fecha</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide" rowSpan={2}>Concepto</th>
                    <th className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wide" rowSpan={2}>Ref.</th>
                    {/* Entradas */}
                    <th colSpan={3} className="text-center px-3 py-2 text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide border-l border-gray-200 dark:border-gray-700">
                      Entradas
                    </th>
                    {/* Salidas */}
                    <th colSpan={3} className="text-center px-3 py-2 text-red-600 dark:text-red-400 font-semibold uppercase tracking-wide border-l border-gray-200 dark:border-gray-700">
                      Salidas
                    </th>
                    {/* Saldo */}
                    <th colSpan={3} className="text-center px-3 py-2 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wide border-l border-gray-200 dark:border-gray-700">
                      Saldo
                    </th>
                  </tr>
                  <tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-right px-3 py-1.5 text-blue-500 font-medium border-l border-gray-200 dark:border-gray-700">Cant.</th>
                    <th className="text-right px-3 py-1.5 text-blue-500 font-medium">V.U.</th>
                    <th className="text-right px-3 py-1.5 text-blue-500 font-medium">V.T.</th>
                    <th className="text-right px-3 py-1.5 text-red-500 font-medium border-l border-gray-200 dark:border-gray-700">Cant.</th>
                    <th className="text-right px-3 py-1.5 text-red-500 font-medium">V.U.</th>
                    <th className="text-right px-3 py-1.5 text-red-500 font-medium">V.T.</th>
                    <th className="text-right px-3 py-1.5 text-emerald-500 font-medium border-l border-gray-200 dark:border-gray-700">Cant.</th>
                    <th className="text-right px-3 py-1.5 text-emerald-500 font-medium">V.U.</th>
                    <th className="text-right px-3 py-1.5 text-emerald-500 font-medium">V.T.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {/* Saldo inicial (si hay filtro de fechas) */}
                  {opening && opening.qty > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-800/40">
                      <td className="px-3 py-2 text-gray-400 italic">—</td>
                      <td className="px-3 py-2 text-gray-500 font-semibold" colSpan={2}>Saldo Inicial</td>
                      <td colSpan={6} />
                      <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold border-l border-gray-200 dark:border-gray-700">
                        {fmtQty(opening.qty)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {fmtCOP(opening.avgCost, 2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                        {fmtCOP(opening.value)}
                      </td>
                    </tr>
                  )}

                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-10 text-center text-gray-400">
                        Sin movimientos en el período seleccionado
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const cfg = TYPE_CONFIG[m.type] ?? { label: m.type, color: 'text-gray-500', dir: 'A' };
                      const isEntry = cfg.dir === 'E';
                      const isExit  = cfg.dir === 'S';
                      const isAdj   = cfg.dir === 'A';
                      const absQty  = Math.abs(m.quantity);
                      const avgCostBalance = m.balance_qty > 0 ? (m.balance_value / m.balance_qty) : 0;

                      return (
                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {fmtDate(m.created_at)}
                          </td>
                          <td className="px-3 py-2">
                            <div>
                              <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
                              {m.reason && (
                                <span className="block text-gray-400 text-xs">{m.reason}</span>
                              )}
                              {m.user?.name && (
                                <span className="block text-gray-400 text-xs">{m.user.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-400">{m.reference ?? '—'}</td>

                          {/* Entradas */}
                          <td className="px-3 py-2 text-right font-mono text-blue-700 dark:text-blue-400 font-semibold border-l border-gray-100 dark:border-gray-700">
                            {isEntry || (isAdj && m.quantity > 0) ? fmtQty(absQty) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">
                            {isEntry || (isAdj && m.quantity > 0) ? fmtCOP(m.unit_cost, 2) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-blue-700 dark:text-blue-400">
                            {isEntry || (isAdj && m.quantity > 0) ? fmtCOP(m.total_cost) : ''}
                          </td>

                          {/* Salidas */}
                          <td className="px-3 py-2 text-right font-mono text-red-700 dark:text-red-400 font-semibold border-l border-gray-100 dark:border-gray-700">
                            {isExit || (isAdj && m.quantity < 0) ? fmtQty(absQty) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-red-600 dark:text-red-400">
                            {isExit || (isAdj && m.quantity < 0) ? fmtCOP(m.unit_cost, 2) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-red-700 dark:text-red-400">
                            {isExit || (isAdj && m.quantity < 0) ? fmtCOP(m.total_cost) : ''}
                          </td>

                          {/* Saldo */}
                          <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold border-l border-gray-100 dark:border-gray-700">
                            {fmtQty(m.balance_qty)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {fmtCOP(avgCostBalance, 2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            {fmtCOP(m.balance_value)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Fila de totales */}
                {movements.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 font-semibold">
                      <td colSpan={3} className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">
                        Totales
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-blue-700 dark:text-blue-400 border-l border-gray-200 dark:border-gray-600">
                        {fmtQty(summary.total_entry_qty)}
                      </td>
                      <td />
                      <td className="px-3 py-2.5 text-right font-mono text-blue-700 dark:text-blue-400">
                        {fmtCOP(summary.total_entry_value)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-700 dark:text-red-400 border-l border-gray-200 dark:border-gray-600">
                        {fmtQty(summary.total_exit_qty)}
                      </td>
                      <td />
                      <td className="px-3 py-2.5 text-right font-mono text-red-700 dark:text-red-400">
                        {fmtCOP(summary.total_exit_value)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400 border-l border-gray-200 dark:border-gray-600">
                        {fmtQty(summary.final_balance_qty)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {fmtCOP(summary.final_avg_cost, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700 dark:text-emerald-400">
                        {fmtCOP(summary.final_balance_value)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      {modalOpen && product && (
        <StockAdjustmentModal
          product={product}
          onClose={() => {
            setModalOpen(false);
            fetchKardex(product.id, { dateFrom, dateTo, type: typeFilter });
          }}
        />
      )}
    </LayoutNew>
  );
}
