import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, RotateCcw, Printer, ClipboardList, AlertCircle,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { accountingApi } from '../../api/modules/accounting';
import { showSuccess, showError } from '../../utils/toast';

// ─── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n) {
  if (!n || n === 0) return null;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(n));
}

const TYPE_LABELS = {
  ingreso: 'Comprobante de Ingreso',
  egreso: 'Comprobante de Egreso',
  diario: 'Comprobante Diario',
  ajuste: 'Comprobante de Ajuste',
  apertura: 'Asiento de Apertura',
  cierre: 'Asiento de Cierre',
  nota_debito: 'Nota Débito',
  nota_credito: 'Nota Crédito',
};

const STATUS_CONFIG = {
  draft: {
    label: 'Borrador',
    dot: 'bg-gray-400',
    chip: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  },
  posted: {
    label: 'Contabilizado',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  },
  reversed: {
    label: 'Anulado',
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  },
};

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Componente ─────────────────────────────────────────────────────────────────
export default function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.getVoucher(id);
        setVoucher(res.data.data ?? res.data);
      } catch {
        showError('No se pudo cargar el comprobante');
        navigate('/accounting/vouchers');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const handlePost = async () => {
    if (!confirm('¿Contabilizar este comprobante? Esta acción no se puede deshacer directamente.')) return;
    setActionLoading(true);
    try {
      const res = await accountingApi.postVoucher(id);
      setVoucher(res.data.data ?? res.data);
      showSuccess('Comprobante contabilizado');
    } catch (e) {
      showError(e.response?.data?.message ?? 'Error al contabilizar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    const reason = prompt('Motivo de anulación (obligatorio):');
    if (!reason?.trim()) return;
    setActionLoading(true);
    try {
      const res = await accountingApi.reverseVoucher(id, { reason });
      setVoucher(res.data.data ?? res.data);
      showSuccess('Comprobante anulado — se creó la contrapartida');
    } catch (e) {
      showError(e.response?.data?.message ?? 'Error al anular');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <LayoutNew>
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </LayoutNew>
    );
  }

  if (!voucher) return null;

  const lines = voucher.lines ?? voucher.voucher_lines ?? [];
  const totalDebit  = lines.reduce((s, l) => s + parseFloat(l.debit  ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit ?? 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.001;

  const dateFormatted = voucher.date
    ? new Date(voucher.date + 'T00:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <LayoutNew>
      <div className="space-y-5 max-w-4xl mx-auto">

        {/* ── Breadcrumb + Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="space-y-1">
            <Link
              to="/accounting/vouchers"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Comprobantes
            </Link>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                {voucher.full_number ?? `#${voucher.id}`}
              </h1>
              <StatusChip status={voucher.status} />
              {!isBalanced && (
                <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Descuadrado
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {TYPE_LABELS[voucher.voucher_type] ?? voucher.voucher_type}
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="btn btn-secondary text-sm gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            {voucher.status === 'draft' && (
              <button
                onClick={handlePost}
                disabled={actionLoading || !isBalanced}
                className="btn btn-primary text-sm gap-1.5 disabled:opacity-50"
                title={!isBalanced ? 'El comprobante debe estar cuadrado' : undefined}
              >
                <CheckCircle className="w-4 h-4" />
                {actionLoading ? 'Procesando...' : 'Contabilizar'}
              </button>
            )}
            {voucher.status === 'posted' && (
              <button
                onClick={handleReverse}
                disabled={actionLoading}
                className="btn text-sm gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {actionLoading ? 'Anulando...' : 'Anular'}
              </button>
            )}
          </div>
        </div>

        {/* ── Metadata ───────────────────────────────────────────────────── */}
        <div className="card">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Fecha</dt>
              <dd className="font-medium text-gray-900 dark:text-white capitalize">{dateFormatted}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Período</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {voucher.period?.name ?? voucher.date?.substring(0, 7) ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Creado por</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {voucher.created_by_user?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Contabilizado por</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {voucher.posted_by_user?.name ?? '—'}
              </dd>
            </div>
            {voucher.description && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Descripción</dt>
                <dd className="text-gray-800 dark:text-gray-200">{voucher.description}</dd>
              </div>
            )}
            {voucher.reversal_of_id && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Contrapartida de</dt>
                <dd>
                  <Link
                    to={`/accounting/vouchers/${voucher.reversal_of_id}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
                  >
                    Ver comprobante original
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ── Tabla de movimientos ─────────────────────────────────────────── */}
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Movimientos ({lines.length} {lines.length === 1 ? 'línea' : 'líneas'})
            </span>
          </div>

          {lines.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">Sin movimientos registrados</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Código</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cuenta</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Tercero</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Descripción</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-blue-500 uppercase tracking-wide">Débito</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-emerald-500 uppercase tracking-wide">Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {lines.map((line, i) => (
                    <tr key={line.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {line.account?.code ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-900 dark:text-white text-xs">
                          {line.account?.name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {line.third_party
                            ? (line.third_party.business_name
                                ?? `${line.third_party.first_name ?? ''} ${line.third_party.last_name ?? ''}`.trim())
                            : <span className="text-gray-300 dark:text-gray-600">—</span>
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                          {line.description || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(line.debit) > 0 ? (
                          <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {fmt(line.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {parseFloat(line.credit) > 0 ? (
                          <span className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {fmt(line.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Fila de totales */}
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/60 border-t-2 border-gray-200 dark:border-gray-600">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-300 hidden lg:table-cell">
                      Totales
                    </td>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-700 dark:text-gray-300 lg:hidden">
                      Totales
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
                        {fmt(totalDebit) ?? '0'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                        {fmt(totalCredit) ?? '0'}
                      </span>
                    </td>
                  </tr>
                  {!isBalanced && (
                    <tr className="bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
                      <td colSpan={6} className="px-4 py-2 text-center">
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Diferencia: {fmt(Math.abs(totalDebit - totalCredit))} — El comprobante no está cuadrado
                        </span>
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </>
          )}
        </div>

      </div>
    </LayoutNew>
  );
}
