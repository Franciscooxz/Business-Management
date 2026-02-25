import { useState } from 'react';
import { Search, Download, ChevronDown, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { reportsApi } from '../../api/modules/reports';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

function Section({ title, color, accounts, total, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <span className={`text-sm font-semibold uppercase tracking-wide ${color}`}>{title}</span>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-bold font-mono ${color}`}>{formatCOP(total)}</span>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && accounts.length > 0 && (
        <table className="w-full">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {accounts.map((acc, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-5 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 w-24">{acc.code}</td>
                <td className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300">{acc.name}</td>
                <td className="px-5 py-2 text-sm font-mono text-right text-gray-900 dark:text-white whitespace-nowrap">{formatCOP(acc.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && accounts.length === 0 && (
        <p className="px-5 py-3 text-sm text-gray-400 italic">Sin movimientos en este período</p>
      )}
    </div>
  );
}

export default function BalanceSheet() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = `${today.substring(0, 4)}-01-01`;

  const [asOfDate,     setAsOfDate]     = useState(today);
  const [periodStart,  setPeriodStart]  = useState(firstDay);
  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await reportsApi.getBalanceSheet({ as_of_date: asOfDate, period_start: periodStart });
      setReport(res.data.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al generar'); }
    finally { setLoading(false); }
  }

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Balance General</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Estado de situación financiera</p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inicio del período (P&G)</label>
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Al corte de</label>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className={inputCls} />
          </div>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 h-9 px-5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-60">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Generando...' : 'Generar'}
          </button>
        </div>

        {report && (
          <>
            {/* Verificación de cuadre */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${report.is_balanced ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
              {report.is_balanced
                ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
              <span className={`text-sm font-medium ${report.is_balanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {report.is_balanced
                  ? `ACTIVO = PASIVO + PATRIMONIO = ${formatCOP(report.activo.total)} ✓`
                  : `Diferencia: ${formatCOP(report.difference)}`}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ACTIVO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">ACTIVO</h2>
                  <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">{formatCOP(report.activo.total)}</span>
                </div>
                <Section title="Activo Corriente" color="text-blue-500 dark:text-blue-400"
                  accounts={report.activo.corriente.accounts} total={report.activo.corriente.total} />
                <Section title="Activo No Corriente" color="text-blue-400 dark:text-blue-300"
                  accounts={report.activo.no_corriente.accounts} total={report.activo.no_corriente.total} defaultOpen={false} />
              </div>

              {/* PASIVO + PATRIMONIO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">PASIVO + PATRIMONIO</h2>
                  <span className="text-base font-bold font-mono text-red-600 dark:text-red-400">{formatCOP(report.total_pasivo_patrimonio)}</span>
                </div>
                <Section title="Pasivo Corriente" color="text-red-500 dark:text-red-400"
                  accounts={report.pasivo.corriente.accounts} total={report.pasivo.corriente.total} />
                <Section title="Pasivo No Corriente" color="text-red-400 dark:text-red-300"
                  accounts={report.pasivo.no_corriente.accounts} total={report.pasivo.no_corriente.total} defaultOpen={false} />

                {/* Patrimonio */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-700/50">
                    <span className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">Patrimonio</span>
                    <span className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">{formatCOP(report.patrimonio.total)}</span>
                  </div>
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {report.patrimonio.accounts.map((acc, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-5 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 w-24">{acc.code}</td>
                          <td className="px-2 py-2 text-sm text-gray-700 dark:text-gray-300">{acc.name}</td>
                          <td className="px-5 py-2 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCOP(acc.balance)}</td>
                        </tr>
                      ))}
                      {/* Resultado del período */}
                      <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                        <td className="px-5 py-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">—</td>
                        <td className="px-2 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">Resultado del Período</td>
                        <td className={`px-5 py-2 text-sm font-mono font-bold text-right ${report.patrimonio.net_income >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCOP(report.patrimonio.net_income)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </LayoutNew>
  );
}
