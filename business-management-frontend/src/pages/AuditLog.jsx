import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserCheck,
  UserX,
  LogIn,
  LogOut,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Activity,
} from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';

// ── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  created:      { label: 'Creado',         color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Plus },
  updated:      { label: 'Modificado',     color: 'bg-blue-50 text-blue-700 ring-blue-200',         icon: Edit },
  deleted:      { label: 'Eliminado',      color: 'bg-red-50 text-red-700 ring-red-200',             icon: Trash2 },
  restored:     { label: 'Restaurado',     color: 'bg-amber-50 text-amber-700 ring-amber-200',       icon: RotateCcw },
  login:        { label: 'Inicio sesion',  color: 'bg-indigo-50 text-indigo-700 ring-indigo-200',    icon: LogIn },
  logout:       { label: 'Cierre sesion',  color: 'bg-gray-50 text-gray-600 ring-gray-200',          icon: LogOut },
  login_failed: { label: 'Login fallido',  color: 'bg-rose-50 text-rose-700 ring-rose-200',          icon: UserX },
};

function EventBadge({ event }) {
  const cfg = EVENT_CONFIG[event] ?? {
    label: event,
    color: 'bg-gray-50 text-gray-600 ring-gray-200',
    icon: Activity,
  };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DiffViewer({ old: oldVals, next: newVals }) {
  if (!oldVals && !newVals) return <span className="text-gray-400 text-xs">—</span>;

  const combined = { ...oldVals, ...newVals };
  const keys = Object.keys(combined);

  if (keys.length === 0) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <div className="text-xs space-y-0.5 max-h-28 overflow-y-auto">
      {keys.map((key) => {
        const prev = oldVals?.[key];
        const curr = newVals?.[key];
        const changed = prev !== undefined && curr !== undefined && prev !== curr;
        const onlyNew = prev === undefined;

        return (
          <div key={key} className="flex gap-1 items-baseline">
            <span className="text-gray-400 shrink-0 font-mono">{key}:</span>
            {changed ? (
              <>
                <span className="line-through text-red-400 font-mono">{String(prev ?? '')}</span>
                <span className="text-emerald-600 font-mono">{String(curr ?? '')}</span>
              </>
            ) : onlyNew ? (
              <span className="text-emerald-600 font-mono">{String(curr ?? '')}</span>
            ) : (
              <span className="text-gray-600 font-mono">{String(prev ?? curr ?? '')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ summary }) {
  if (!summary) return null;

  const { by_event = {}, failed_logins_24h = 0 } = summary;

  const cards = [
    { label: 'Creaciones',   value: by_event.created ?? 0,      color: 'text-emerald-600' },
    { label: 'Ediciones',    value: by_event.updated ?? 0,      color: 'text-blue-600' },
    { label: 'Eliminados',   value: by_event.deleted ?? 0,      color: 'text-red-600' },
    { label: 'Login fallido (24h)', value: failed_logins_24h,   color: 'text-rose-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [logs, setLogs]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [meta, setMeta]         = useState({ current_page: 1, last_page: 1, total: 0 });

  const [filters, setFilters] = useState({
    event:     '',
    date_from: '',
    date_to:   '',
    search:    '',
    page:      1,
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.event)     params.event     = filters.event;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to)   params.date_to   = filters.date_to;
      if (filters.search)    params.search    = filters.search;
      params.page     = filters.page;
      params.per_page = 20;

      const [logsRes, summaryRes] = await Promise.all([
        api.get('/audit-logs', { params }),
        api.get('/audit-logs/summary', { params: { days: 30 } }),
      ]);

      setLogs(logsRes.data.data ?? []);
      setMeta({
        current_page: logsRes.data.meta?.current_page ?? 1,
        last_page:    logsRes.data.meta?.last_page    ?? 1,
        total:        logsRes.data.meta?.total        ?? 0,
      });
      setSummary(summaryRes.data.data ?? summaryRes.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo cargar el registro de auditoría.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function handleFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  function handlePage(page) {
    setFilters((f) => ({ ...f, page }));
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <LayoutNew>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Registro de Auditoría</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Trazabilidad completa de cambios y accesos al sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Summary */}
        <SummaryCards summary={summary} />

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por usuario o modelo..."
                  value={filters.search}
                  onChange={(e) => handleFilter('search', e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Evento */}
              <select
                value={filters.event}
                onChange={(e) => handleFilter('event', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">Todos los eventos</option>
                {Object.entries(EVENT_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>

              {/* Fecha desde */}
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilter('date_from', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />

              {/* Fecha hasta */}
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilter('date_to', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Clear filters */}
            {(filters.event || filters.date_from || filters.date_to || filters.search) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setFilters({ event: '', date_from: '', date_to: '', search: '', page: 1 })}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {meta.total.toLocaleString()} registros en total
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Fecha / Hora
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Usuario
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Evento
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Registro
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-72">
                    Cambios
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <ShieldCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay registros de auditoría con los filtros aplicados.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Página {meta.current_page} de {meta.last_page}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePage(meta.current_page - 1)}
                  disabled={meta.current_page === 1}
                  className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                  const page = Math.max(1, Math.min(meta.current_page - 2, meta.last_page - 4)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePage(page)}
                      className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                        page === meta.current_page
                          ? 'bg-indigo-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePage(meta.current_page + 1)}
                  disabled={meta.current_page === meta.last_page}
                  className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutNew>
  );
}

// ── Log Row (expanded inline) ────────────────────────────────────────────────

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(log.created_at);
  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {/* Fecha */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-gray-900 dark:text-white font-mono text-xs">{dateStr}</p>
          <p className="text-gray-400 dark:text-gray-500 font-mono text-xs">{timeStr}</p>
        </td>

        {/* Usuario */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-gray-900 dark:text-white text-xs font-medium">{log.user_name ?? 'Sistema'}</p>
          {log.user_id && (
            <p className="text-gray-400 dark:text-gray-500 text-xs">ID #{log.user_id}</p>
          )}
        </td>

        {/* Evento */}
        <td className="px-4 py-3 whitespace-nowrap">
          <EventBadge event={log.event} />
        </td>

        {/* Registro */}
        <td className="px-4 py-3">
          <p className="text-gray-900 dark:text-white text-xs font-medium">{log.model_label ?? log.model_type?.split('\\').pop()}</p>
          {log.description && (
            <p className="text-gray-400 dark:text-gray-500 text-xs truncate max-w-[160px]">{log.description}</p>
          )}
        </td>

        {/* Cambios (resumen) */}
        <td className="px-4 py-3">
          <DiffViewer old={log.old_values} next={log.new_values} />
        </td>

        {/* IP */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{log.ip_address ?? '—'}</span>
        </td>
      </tr>

      {/* Expanded row: full detail */}
      {expanded && (
        <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">URL</p>
                <p className="font-mono text-gray-700 dark:text-gray-300 break-all">{log.url ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">User Agent</p>
                <p className="text-gray-700 dark:text-gray-300 break-all">{log.user_agent ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">ID del registro</p>
                <p className="font-mono text-gray-700 dark:text-gray-300">{log.model_id ?? '—'}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
