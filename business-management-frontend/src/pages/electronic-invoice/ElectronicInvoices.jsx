import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, RefreshCw, ChevronLeft, ChevronRight,
  Eye, Send, AlertCircle, CheckCircle2, Clock, XCircle,
  FileX, Download, BarChart2,
} from 'lucide-react';
import { electronicInvoiceApi } from '../../api/modules/electronicInvoice';

// ── Configuración de estados ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Borrador',    color: 'bg-gray-100 text-gray-700',   icon: FileText    },
  signed:    { label: 'Firmado',     color: 'bg-blue-100 text-blue-700',   icon: FileText    },
  sent:      { label: 'Enviado',     color: 'bg-yellow-100 text-yellow-700', icon: Clock     },
  accepted:  { label: 'Aceptado',   color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected:  { label: 'Rechazado',  color: 'bg-red-100 text-red-700',     icon: XCircle     },
  cancelled: { label: 'Anulado',    color: 'bg-red-50 text-red-400',      icon: FileX       },
};

const DOC_TYPE_LABEL = { '01': 'Factura', '91': 'Nota Crédito', '92': 'Nota Débito' };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600', icon: FileText };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:    'border-blue-500 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    yellow:  'border-yellow-500 bg-yellow-50 text-yellow-700',
    red:     'border-red-500 bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-lg border-l-4 p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

export default function ElectronicInvoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [actionId, setActionId]   = useState(null);
  const [filters, setFilters]     = useState({ search: '', status: '', document_type: '' });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [invoicesRes, statsRes] = await Promise.all([
        electronicInvoiceApi.getInvoices({
          ...filters,
          page,
          per_page: pagination.per_page,
        }),
        electronicInvoiceApi.getStats(),
      ]);
      setInvoices(invoicesRes.data.data);
      setPagination({
        current_page: invoicesRes.data.current_page,
        last_page:    invoicesRes.data.last_page,
        total:        invoicesRes.data.total,
        per_page:     invoicesRes.data.per_page,
      });
      setStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.per_page]);

  useEffect(() => { fetchData(1); }, [filters]);

  // ── Acciones ─────────────────────────────────────────────────────────────────

  const handleSend = async (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Enviar esta factura a la DIAN?')) return;
    setActionId(id);
    try {
      const res = await electronicInvoiceApi.send(id);
      alert(res.data.message);
      fetchData(pagination.current_page);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al enviar');
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadXml = async (e, id, fullNumber) => {
    e.stopPropagation();
    try {
      const res = await electronicInvoiceApi.downloadXml(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fullNumber}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar XML');
    }
  };

  const fmtCurrency = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0);

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '-';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación Electrónica</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de documentos electrónicos DIAN</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/electronic-invoice/resolutions"
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Resoluciones
          </Link>
          <Link
            to="/electronic-invoice/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Nueva Factura
          </Link>
        </div>
      </div>

      {/* ── Cards de estadísticas ───────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Emitidas este mes"
            value={stats.total_month}
            color="blue"
          />
          <StatCard
            label="Aceptadas DIAN"
            value={stats.total_accepted}
            sub={fmtCurrency(stats.value_month)}
            color="emerald"
          />
          <StatCard
            label="Pendientes"
            value={stats.total_pending}
            color="yellow"
          />
          <StatCard
            label="Rechazadas"
            value={stats.total_rejected}
            color="red"
          />
        </div>
      )}

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, NIT o CUFE..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filters.document_type}
            onChange={e => setFilters(f => ({ ...f, document_type: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="01">Facturas de Venta</option>
            <option value="91">Notas Crédito</option>
            <option value="92">Notas Débito</option>
          </select>
          <button
            onClick={() => fetchData(pagination.current_page)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Número</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">NIT / Doc</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado DIAN</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Cargando...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <FileText size={36} className="mx-auto mb-2 opacity-30" />
                    No se encontraron facturas.
                  </td>
                </tr>
              ) : invoices.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/electronic-invoice/${inv.id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                    {inv.full_number}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {DOC_TYPE_LABEL[inv.document_type] ?? inv.document_type}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fmtDate(inv.issue_date)}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className="truncate block">{inv.buyer_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {inv.buyer_document}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {fmtCurrency(inv.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {/* Ver detalle */}
                      <Link
                        to={`/electronic-invoice/${inv.id}`}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </Link>

                      {/* Enviar a DIAN */}
                      {['draft', 'signed', 'rejected'].includes(inv.status) && (
                        <button
                          onClick={e => handleSend(e, inv.id)}
                          disabled={actionId === inv.id}
                          className="p-1.5 rounded hover:bg-blue-100 text-blue-600 disabled:opacity-40"
                          title="Enviar a DIAN"
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* Verificar estado */}
                      {inv.status === 'sent' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setActionId(inv.id);
                            try {
                              await electronicInvoiceApi.checkStatus(inv.id);
                              fetchData(pagination.current_page);
                            } finally { setActionId(null); }
                          }}
                          disabled={actionId === inv.id}
                          className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 disabled:opacity-40"
                          title="Verificar estado DIAN"
                        >
                          <RefreshCw size={15} className={actionId === inv.id ? 'animate-spin' : ''} />
                        </button>
                      )}

                      {/* Descargar XML */}
                      {inv.xml_content && (
                        <button
                          onClick={e => handleDownloadXml(e, inv.id, inv.full_number)}
                          className="p-1.5 rounded hover:bg-emerald-100 text-emerald-600"
                          title="Descargar XML"
                        >
                          <Download size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Paginación ──────────────────────────────────────────────────── */}
        {pagination.last_page > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando {((pagination.current_page - 1) * pagination.per_page) + 1}–
              {Math.min(pagination.current_page * pagination.per_page, pagination.total)} de {pagination.total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => fetchData(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 rounded bg-blue-600 text-white font-medium">
                {pagination.current_page}
              </span>
              <button
                onClick={() => fetchData(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
