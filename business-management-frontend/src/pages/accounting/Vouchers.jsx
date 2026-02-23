import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, ClipboardList, ChevronLeft, ChevronRight,
  CheckCircle, RotateCcw, Eye,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { accountingApi } from '../../api/modules/accounting';
import { showSuccess, showError } from '../../utils/toast';

// ─── Constantes ─────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  ingreso:      'Ingreso',
  egreso:       'Egreso',
  diario:       'Diario',
  ajuste:       'Ajuste',
  apertura:     'Apertura',
  cierre:       'Cierre',
  nota_debito:  'Nota Débito',
  nota_credito: 'Nota Crédito',
};

const STATUS_CONFIG = {
  draft: {
    label: 'Borrador',
    dot: 'bg-gray-400',
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-700',
  },
  posted: {
    label: 'Contabilizado',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  reversed: {
    label: 'Anulado',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
};

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function formatCOP(amount) {
  if (!amount || Number(amount) === 0) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Componente ─────────────────────────────────────────────────────────────────
export default function Vouchers() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 20 };
      if (search) params.search = search;
      if (typeFilter) params.voucher_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await accountingApi.getVouchers(params);
      setItems(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showError('Error al cargar comprobantes');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handlePost = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Contabilizar este comprobante? Esta acción no se puede deshacer directamente.')) return;
    try {
      await accountingApi.postVoucher(id);
      showSuccess('Comprobante contabilizado');
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al contabilizar');
    }
  };

  const handleReverse = async (id, e) => {
    e.stopPropagation();
    const reason = prompt('Motivo de anulación:');
    if (!reason) return;
    try {
      await accountingApi.reverseVoucher(id, { reason });
      showSuccess('Comprobante anulado');
      fetchAll();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al anular');
    }
  };

  const resetFilters = () => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(1); };
  const hasFilters = search || typeFilter || statusFilter;

  return (
    <LayoutNew>
      <div className="space-y-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Comprobantes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Libro diario — partida doble</p>
          </div>
          <Link to="/accounting/vouchers/create" className="btn btn-primary self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuevo Comprobante
          </Link>
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────────── */}
        <div className="card p-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número o descripción..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input pl-9 h-9 text-sm w-full"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="input h-9 text-sm w-36"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input h-9 text-sm w-36"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="posted">Contabilizado</option>
            <option value="reversed">Anulado</option>
          </select>
          {hasFilters && (
            <button onClick={resetFilters} className="btn btn-secondary h-9 text-sm px-3">
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* ── Contenido ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {hasFilters ? 'Sin resultados' : 'Sin comprobantes'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {hasFilters
                ? 'Ajusta los filtros de búsqueda'
                : 'Crea el primer comprobante con el botón de arriba'}
            </p>
            {!hasFilters && (
              <Link to="/accounting/vouchers/create" className="btn btn-primary mx-auto">
                <Plus className="w-4 h-4" />
                Nuevo Comprobante
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Número</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Descripción</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-blue-500 uppercase tracking-wide">Débito</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-emerald-500 uppercase tracking-wide hidden sm:table-cell">Crédito</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => navigate(`/accounting/vouchers/${v.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                          {v.full_number ?? `#${v.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {TYPE_LABELS[v.voucher_type] ?? v.voucher_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {v.date
                            ? new Date(v.date + 'T00:00:00').toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell max-w-xs">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.description ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {formatCOP(v.total_debit)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCOP(v.total_credit)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={v.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/accounting/vouchers/${v.id}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Ver detalle"
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {v.status === 'draft' && (
                            <button
                              onClick={(e) => handlePost(v.id, e)}
                              title="Contabilizar"
                              className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {v.status === 'posted' && (
                            <button
                              onClick={(e) => handleReverse(v.id, e)}
                              title="Anular"
                              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Paginación ──────────────────────────────────────────────── */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  {meta.from}–{meta.to} de {meta.total} comprobantes
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <span className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {page} / {meta.last_page}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === meta.last_page}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </LayoutNew>
  );
}
