import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Send, RefreshCw, Download, XCircle,
  CheckCircle2, Clock, FileText, FileX, AlertCircle,
  Copy, ExternalLink, Code2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { electronicInvoiceApi } from '../../api/modules/electronicInvoice';

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Borrador',   color: 'bg-gray-100 text-gray-700',     icon: FileText    },
  signed:    { label: 'Firmado',    color: 'bg-blue-100 text-blue-700',     icon: FileText    },
  sent:      { label: 'Enviado',    color: 'bg-yellow-100 text-yellow-700', icon: Clock       },
  accepted:  { label: 'Aceptado',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected:  { label: 'Rechazado', color: 'bg-red-100 text-red-700',       icon: XCircle     },
  cancelled: { label: 'Anulado',   color: 'bg-red-50 text-red-400',        icon: FileX       },
};

const DOC_TYPE_LABEL = { '01': 'Factura de Venta', '91': 'Nota Crédito', '92': 'Nota Débito' };

function StatusBadge({ status, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-600', icon: FileText };
  const Icon = cfg.icon;
  const sz = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sz} ${cfg.color}`}>
      <Icon size={size === 'lg' ? 14 : 11} />
      {cfg.label}
    </span>
  );
}

function InfoRow({ label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-36">{label}</span>
      <span className={`text-sm text-gray-800 text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setAction] = useState('');
  const [showXml, setShowXml]     = useState(false);
  const [copied, setCopied]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await electronicInvoiceApi.getInvoice(id);
      setInvoice(res.data.data);
    } catch {
      navigate('/electronic-invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const fmtCurrency = (v) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v ?? 0);

  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO') : '—';

  const handleAction = async (action, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setAction(action);
    try {
      if (action === 'send') {
        const res = await electronicInvoiceApi.send(id);
        alert(res.data.message);
      } else if (action === 'check') {
        await electronicInvoiceApi.checkStatus(id);
      } else if (action === 'generate-xml') {
        await electronicInvoiceApi.generateXml(id);
      } else if (action === 'cancel') {
        await electronicInvoiceApi.cancel(id);
      }
      await load();
    } catch (err) {
      alert(err.response?.data?.message ?? `Error en la acción: ${action}`);
    } finally {
      setAction('');
    }
  };

  const handleDownloadXml = async () => {
    try {
      const res = await electronicInvoiceApi.downloadXml(id);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.full_number}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar XML');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!invoice) return null;

  const items = invoice.items ?? [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Encabezado ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/electronic-invoice')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {invoice.full_number}
              </h1>
              <StatusBadge status={invoice.status} size="lg" />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {DOC_TYPE_LABEL[invoice.document_type] ?? invoice.document_type}
              {' · '}
              {fmtDate(invoice.issue_date)}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => handleAction('generate-xml', null)}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-40"
            >
              {actionLoading === 'generate-xml'
                ? <RefreshCw size={14} className="animate-spin" />
                : <Code2 size={14} />}
              Generar XML
            </button>
          )}

          {['draft', 'signed', 'rejected'].includes(invoice.status) && (
            <button
              onClick={() => handleAction('send', '¿Enviar esta factura a la DIAN?')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40"
            >
              {actionLoading === 'send'
                ? <RefreshCw size={14} className="animate-spin" />
                : <Send size={14} />}
              Enviar a DIAN
            </button>
          )}

          {invoice.status === 'sent' && (
            <button
              onClick={() => handleAction('check', null)}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-50 disabled:opacity-40"
            >
              {actionLoading === 'check'
                ? <RefreshCw size={14} className="animate-spin" />
                : <RefreshCw size={14} />}
              Verificar Estado
            </button>
          )}

          {invoice.xml_content && (
            <button
              onClick={handleDownloadXml}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50"
            >
              <Download size={14} />
              Descargar XML
            </button>
          )}

          {!['cancelled', 'accepted'].includes(invoice.status) && (
            <button
              onClick={() => handleAction('cancel', '¿Anular este documento? Esta acción no se puede deshacer para facturas enviadas a la DIAN.')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >
              <XCircle size={14} />
              Anular
            </button>
          )}
        </div>
      </div>

      {/* ── Estado DIAN ─────────────────────────────────────────────────── */}
      {invoice.dian_status_message && (
        <div className={`rounded-lg p-4 border flex gap-3 ${
          invoice.dian_is_valid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          {invoice.dian_is_valid
            ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <div className="text-sm">
            <p className="font-semibold">
              DIAN: {invoice.dian_status_code ?? '—'}
            </p>
            <p className="mt-0.5">{invoice.dian_status_message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Panel izquierdo ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Datos del documento */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">
              Datos del Documento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              <div>
                <InfoRow label="Número"        value={invoice.full_number} mono />
                <InfoRow label="Tipo"           value={DOC_TYPE_LABEL[invoice.document_type]} />
                <InfoRow label="Fecha emisión"  value={fmtDate(invoice.issue_date)} />
                <InfoRow label="Hora emisión"   value={invoice.issue_time} mono />
                <InfoRow label="Resolución"     value={invoice.resolution?.resolution_number} />
                <InfoRow label="Prefijo"        value={invoice.prefix || '(Sin prefijo)'} />
              </div>
              <div>
                <InfoRow label="Moneda"         value={invoice.currency} />
                <InfoRow label="Notas"          value={invoice.notes} />
                {invoice.sent_at && (
                  <InfoRow label="Enviado el"   value={new Date(invoice.sent_at).toLocaleString('es-CO')} />
                )}
                {invoice.accepted_at && (
                  <InfoRow label="Aceptado el"  value={new Date(invoice.accepted_at).toLocaleString('es-CO')} />
                )}
                {invoice.dian_track_id && (
                  <InfoRow label="TrackId DIAN" value={invoice.dian_track_id} mono />
                )}
              </div>
            </div>

            {/* CUFE */}
            {invoice.cufe && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase">CUFE</span>
                  <button
                    onClick={() => copyToClipboard(invoice.cufe)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Copy size={11} />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-700 break-all">{invoice.cufe}</p>

                {invoice.validation_url && (
                  <a
                    href={invoice.validation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink size={11} />
                    Verificar en DIAN
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Comprador */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">
              Comprador / Adquirente
            </h2>
            <InfoRow label="Nombre"         value={invoice.buyer_name} />
            <InfoRow label="Tipo documento" value={invoice.buyer_document_type} />
            <InfoRow label="Número doc."    value={invoice.buyer_document} mono />
            <InfoRow label="Email"          value={invoice.buyer_email} />
            <InfoRow label="Ciudad"         value={invoice.buyer_city} />
            <InfoRow label="Dirección"      value={invoice.buyer_address} />
          </div>

          {/* Líneas / Ítems */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                Líneas de Factura
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">#</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">Descripción</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500">U.M.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500">Cant.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500">Precio Unit.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500">Desc.</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500">Subtotal</th>
                    <th className="text-center px-3 py-2 font-semibold text-gray-500">Tributo</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-500">Impuesto</th>
                    <th className="text-right px-4 py-2 font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400 text-xs">{item.line_number}</td>
                      <td className="px-4 py-2 max-w-xs">
                        <p className="truncate">{item.description}</p>
                        {item.standard_code && (
                          <p className="text-xs text-gray-400 font-mono">{item.standard_code}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 text-xs">{item.unit_code}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(item.quantity)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-600">
                        {fmtCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600 text-xs">
                        {item.discount_rate > 0 ? `${Math.round(item.discount_rate * 100)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {fmtCurrency(item.subtotal)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                          {item.tax_name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-blue-700">
                        {fmtCurrency(item.tax_value)}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold font-mono">
                        {fmtCurrency(item.total_line)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visor XML */}
          {invoice.xml_content && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowXml(x => !x)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
              >
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                  <Code2 size={15} />
                  XML UBL 2.1
                </h2>
                {showXml ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showXml && (
                <div className="border-t border-gray-200">
                  <div className="flex justify-end px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <button
                      onClick={() => copyToClipboard(invoice.xml_content)}
                      className="text-xs text-blue-600 flex items-center gap-1"
                    >
                      <Copy size={11} /> {copied ? 'Copiado!' : 'Copiar XML'}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-96 bg-gray-900 text-green-400">
                    {invoice.xml_content}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Panel derecho: Totales ────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide mb-4">
              Totales
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{fmtCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.discount_total) > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>− Descuentos</span>
                  <span className="font-mono">−{fmtCurrency(invoice.discount_total)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_iva) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>IVA</span>
                  <span className="font-mono">{fmtCurrency(invoice.tax_iva)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_inc) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>INC</span>
                  <span className="font-mono">{fmtCurrency(invoice.tax_inc)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_ica) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>ICA</span>
                  <span className="font-mono">{fmtCurrency(invoice.tax_ica)}</span>
                </div>
              )}

              {/* Retenciones */}
              {parseFloat(invoice.tax_retefuente) > 0 && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>− Ret. Fuente</span>
                  <span className="font-mono">−{fmtCurrency(invoice.tax_retefuente)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_reteiva) > 0 && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>− Ret. IVA</span>
                  <span className="font-mono">−{fmtCurrency(invoice.tax_reteiva)}</span>
                </div>
              )}
              {parseFloat(invoice.tax_reteica) > 0 && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>− Ret. ICA</span>
                  <span className="font-mono">−{fmtCurrency(invoice.tax_reteica)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="font-mono text-blue-700">{fmtCurrency(invoice.total)}</span>
              </div>
              {invoice.net_payable !== undefined && parseFloat(invoice.net_payable) !== parseFloat(invoice.total) && (
                <div className="flex justify-between text-gray-700 font-semibold border-t border-dashed border-gray-200 pt-2">
                  <span>Valor neto a pagar</span>
                  <span className="font-mono">{fmtCurrency(invoice.net_payable)}</span>
                </div>
              )}
            </div>

            {/* Acciones rápidas */}
            <div className="mt-5 space-y-2 pt-4 border-t border-gray-200">
              {['draft', 'signed', 'rejected'].includes(invoice.status) && (
                <button
                  onClick={() => handleAction('send', '¿Enviar esta factura a la DIAN?')}
                  disabled={!!actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {actionLoading === 'send'
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Send size={14} />}
                  Enviar a DIAN
                </button>
              )}

              {invoice.status === 'accepted' && invoice.document_type === '01' && (
                <Link
                  to={`/electronic-invoice/create?reference=${invoice.id}&type=91`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <FileX size={14} />
                  Nota Crédito
                </Link>
              )}

              {invoice.xml_content && (
                <button
                  onClick={handleDownloadXml}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50"
                >
                  <Download size={14} />
                  Descargar XML
                </button>
              )}
            </div>

            {/* Meta */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              {invoice.created_by && (
                <p>Creado por: <span className="text-gray-600">{invoice.created_by?.name}</span></p>
              )}
              <p>Creado: {new Date(invoice.created_at).toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
