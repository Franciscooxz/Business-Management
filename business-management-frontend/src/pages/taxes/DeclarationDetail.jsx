import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, CheckCircle, CreditCard, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { taxesApi } from '../../api/modules/taxes';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

const STATUS_COLORS = {
  borrador:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  presentada: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  pagada:     'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
};
const STATUS_LABELS = { borrador: 'Borrador', presentada: 'Presentada', pagada: 'Pagada' };

function SummaryCard({ label, value, color = 'text-gray-900 dark:text-white', sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-semibold font-mono mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DeclarationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [declaration, setDeclaration] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [presenting, setPresenting]   = useState(false);
  const [paying, setPaying]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxesApi.getDeclaration(id);
      setDeclaration(res.data.data);
    } catch { showError('Error al cargar la declaración'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleCalculate() {
    setCalculating(true);
    try {
      const res = await taxesApi.calculateDeclaration(id);
      setDeclaration(res.data.data);
      showSuccess('Declaración calculada');
    } catch (err) { showError(err.response?.data?.message ?? 'Error al calcular'); }
    finally { setCalculating(false); }
  }

  async function handlePresent() {
    if (!window.confirm('¿Marcar esta declaración como Presentada ante la DIAN?')) return;
    setPresenting(true);
    try {
      const res = await taxesApi.presentDeclaration(id);
      setDeclaration(res.data.data);
      showSuccess('Declaración marcada como presentada');
    } catch (err) { showError(err.response?.data?.message ?? 'Error'); }
    finally { setPresenting(false); }
  }

  async function handlePay() {
    if (!window.confirm('¿Marcar esta declaración como Pagada?')) return;
    setPaying(true);
    try {
      const res = await taxesApi.payDeclaration(id);
      setDeclaration(res.data.data);
      showSuccess('Declaración marcada como pagada');
    } catch (err) { showError(err.response?.data?.message ?? 'Error'); }
    finally { setPaying(false); }
  }

  if (loading) {
    return (
      <LayoutNew>
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">Cargando declaración...</div>
      </LayoutNew>
    );
  }

  if (!declaration) {
    return (
      <LayoutNew>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-500">Declaración no encontrada</p>
          <button onClick={() => navigate('/taxes/declarations')} className="text-sm text-primary-600 hover:underline">
            Volver a declaraciones
          </button>
        </div>
      </LayoutNew>
    );
  }

  const d = declaration;
  const isIva = d.type === 'iva';

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/taxes/declarations')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{d.type_label}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {d.period_label} &nbsp;·&nbsp; {d.start_date} – {d.end_date}
              </p>
            </div>
          </div>

          {/* Acciones según estado */}
          <div className="flex items-center gap-2">
            {d.status === 'borrador' && (
              <>
                <button onClick={handleCalculate} disabled={calculating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-60">
                  <Calculator className="w-4 h-4" />
                  {calculating ? 'Calculando...' : 'Calcular'}
                </button>
                <button onClick={handlePresent} disabled={presenting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-60">
                  <CheckCircle className="w-4 h-4" />
                  {presenting ? '...' : 'Presentar'}
                </button>
              </>
            )}
            {d.status === 'presentada' && (
              <button onClick={handlePay} disabled={paying}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 disabled:opacity-60">
                <CreditCard className="w-4 h-4" />
                {paying ? '...' : 'Marcar Pagada'}
              </button>
            )}
            {d.status !== 'borrador' && d.status !== 'pagada' && (
              <button onClick={handleCalculate} disabled={calculating}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60">
                <Calculator className="w-4 h-4" />
                Recalcular
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas de totales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label={isIva ? 'IVA Generado' : 'ReteFuente Practicada'}
            value={formatCOP(d.total_tax_generated)}
            color="text-gray-900 dark:text-white"
          />
          {isIva && (
            <SummaryCard
              label="IVA Descontable"
              value={formatCOP(d.total_tax_discountable)}
              color="text-gray-900 dark:text-white"
            />
          )}
          {Number(d.previous_balance_favor) > 0 && (
            <SummaryCard
              label="Saldo Favor Anterior"
              value={formatCOP(d.previous_balance_favor)}
              color="text-emerald-600 dark:text-emerald-400"
            />
          )}
          <SummaryCard
            label="Saldo a Pagar"
            value={formatCOP(d.saldo_pagar)}
            color="text-red-600 dark:text-red-400"
          />
          {Number(d.saldo_favor) > 0 && (
            <SummaryCard
              label="Saldo a Favor"
              value={formatCOP(d.saldo_favor)}
              color="text-emerald-600 dark:text-emerald-400"
              sub="Trasladar al siguiente período"
            />
          )}
        </div>

        {/* Fechas de gestión */}
        {(d.presented_at || d.paid_at) && (
          <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
            {d.presented_at && <span>Presentada: <strong>{new Date(d.presented_at).toLocaleDateString('es-CO')}</strong></span>}
            {d.paid_at     && <span>Pagada: <strong>{new Date(d.paid_at).toLocaleDateString('es-CO')}</strong></span>}
          </div>
        )}

        {/* Detalle de retenciones asociadas */}
        {d.entries && d.entries.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Retenciones asociadas ({d.entries.length})
              </h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Fecha', 'Concepto', 'Tercero', 'Documento', 'Base', 'Tasa', 'Impuesto'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {d.entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{e.document_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{e.concept?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {e.third_party?.name ?? e.third_party?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{e.document_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(e.base_amount)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-500">{e.rate}%</td>
                    <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">{formatCOP(e.tax_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">
                    {formatCOP(d.entries.reduce((s, e) => s + Number(e.base_amount), 0))}
                  </td>
                  <td />
                  <td className="px-4 py-2.5 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">
                    {formatCOP(d.entries.reduce((s, e) => s + Number(e.tax_amount), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Notas */}
        {d.notes && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">{d.notes}</p>
          </div>
        )}
      </div>
    </LayoutNew>
  );
}
