import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, AlertTriangle, TrendingDown, BarChart2,
  Search, RefreshCw, X,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { inventoryApi } from '../../api/modules/inventory';
import { showError } from '../../utils/toast';

function fmtCOP(n) {
  if (!n && n !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(n));
}

function StatusBadge({ product }) {
  if (product.stock <= 0) {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
        Sin stock
      </span>
    );
  }
  if (product.stock <= (product.min_stock || 5)) {
    return (
      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        Stock bajo
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
      Normal
    </span>
  );
}

function stockPriority(p) {
  if (p.stock <= 0) return 0;
  if (p.stock <= (p.min_stock || 5)) return 1;
  return 2;
}

export default function InventoryOverview() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getProducts({ per_page: 500 });
      setProducts(res.data.data ?? []);
    } catch {
      showError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // KPIs
  const totalProducts = products.length;
  const outOfStock    = products.filter((p) => p.stock <= 0).length;
  const lowStock      = products.filter((p) => p.stock > 0 && p.stock <= (p.min_stock || 5)).length;
  const totalValue    = products.reduce((s, p) => s + p.stock * (p.avg_cost || 0), 0);

  const filtered = products
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => stockPriority(a) - stockPriority(b));

  const kpis = [
    {
      label:  'Total Productos',
      value:  totalProducts,
      suffix: 'productos',
      icon:   Package,
      color:  'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label:  'Valor del Inventario',
      value:  fmtCOP(totalValue),
      suffix: 'al costo promedio',
      icon:   TrendingDown,
      color:  'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label:  'Stock Bajo',
      value:  lowStock,
      suffix: 'productos críticos',
      icon:   AlertTriangle,
      color:  lowStock > 0
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
        : 'text-gray-400 bg-gray-50 dark:bg-gray-800',
    },
    {
      label:  'Sin Stock',
      value:  outOfStock,
      suffix: 'productos agotados',
      icon:   Package,
      color:  outOfStock > 0
        ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
        : 'text-gray-400 bg-gray-50 dark:bg-gray-800',
    },
  ];

  return (
    <LayoutNew>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Inventario</h1>
            <p className="page-subtitle">Vista general del estado del inventario</p>
          </div>
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="btn btn-secondary self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="card flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{suffix}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="card p-0 overflow-hidden">

          {/* Buscador */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Contenido */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {search ? 'No se encontraron productos' : 'No hay productos registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Producto</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Categoría</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mín.</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valor</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kardex</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {product.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${
                          product.stock <= 0
                            ? 'text-red-600 dark:text-red-400'
                            : product.stock <= (product.min_stock || 5)
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {product.stock}
                        </span>
                        <span className="ml-1 text-xs text-gray-400">
                          {product.unit_of_measure ?? 'UND'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                        {product.min_stock ?? 5}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {fmtCOP(product.stock * (product.avg_cost || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge product={product} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/inventory/kardex?product_id=${product.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer de la tabla */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-500 dark:text-gray-400">
              Mostrando <span className="font-medium">{filtered.length}</span> de{' '}
              <span className="font-medium">{totalProducts}</span> productos
              {(outOfStock > 0 || lowStock > 0) && (
                <span className="ml-3">
                  {outOfStock > 0 && (
                    <span className="text-red-500 font-medium">{outOfStock} sin stock</span>
                  )}
                  {outOfStock > 0 && lowStock > 0 && <span className="mx-1">·</span>}
                  {lowStock > 0 && (
                    <span className="text-amber-500 font-medium">{lowStock} stock bajo</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </LayoutNew>
  );
}
