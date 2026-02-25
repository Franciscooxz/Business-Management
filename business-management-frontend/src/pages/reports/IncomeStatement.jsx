import { useState } from 'react';
import { Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { reportsApi } from '../../api/modules/reports';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

function pct(v) {
  if (v === null || v === undefined) return '—';
  return `${Number(v).toFixed(1)}%`;
}

function Row({ label, value, indent = 0, bold = false, color, sub, pctVal, borderTop = false }) {
  const base = bold ? 'font-bold' : 'font-normal';
  const col  = color ?? (value >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400');
  return (
    <div className={`flex items-center justify-between py-2 px-4 ${borderTop ? 'border-t-2 border-gray-300 dark:border-gray-600 mt-1' : ''}`}
      style={{ paddingLeft: `${16 + indent * 20}px` }}>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${base} text-gray-700 dark:text-gray-300`}>{label}</span>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-4">
        {pctVal !== undefined && (
          <span className="text-xs text-gray-400 font-mono w-16 text-right">{pct(pctVal)}</span>
        )}
        <span className={`text-sm font-mono text-right w-36 ${base} ${col}`}>{formatCOP(value)}</span>
      </div>
    </div>
  );
}

function AccountBlock({ accounts }) {
  const [open, setOpen] = useState(false);
  if (!accounts?.length) return null;
  return (
    <div className="border-l-2 border-gray-200 dark:border-gray-700 ml-8 mt-1">
      <button onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-1 transition-colors">
        {open ? '▾' : '▸'} {open ? 'Ocultar' : 'Ver'} detalle ({accounts.length} cuentas)
      </button>
      {open && accounts.map((a, i) => (
        <div key={i} className="flex items-center justify-between py-1 px-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{a.code}</span>
          <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 mx-3 truncate">{a.name}</span>
          <span className="text-xs font-mono text-right text-gray-700 dark:text-gray-300 w-28">{formatCOP(a.balance)}</span>
        </div>
      ))}
    </div>
  );
}

function exportCSV(report) {
  if (!report) return;
  const rows = [
    ['ESTADO DE RESULTADOS', '', ''],
    [`Período: ${report.start_date} — ${report.end_date}`, '', ''],
    ['', '', ''],
    ['CONCEPTO', 'VALOR', '% INGRESOS'],
    ['Ingresos Operacionales', report.ingresos_operacionales.total, ''],
    ['Ingresos No Operacionales', report.ingresos_no_operacionales.total, ''],
    ['TOTAL INGRESOS', report.total_ingresos, '100%'],
    ['(-) Costo de Ventas', report.costo_ventas.total, ''],
    ['= UTILIDAD BRUTA', report.utilidad_bruta, pct(report.margen_bruto_pct)],
    ['(-) Gastos Operacionales', report.gastos_operacionales.total, ''],
    ['= UTILIDAD OPERACIONAL', report.utilidad_operacional, pct(report.margen_operacional_pct)],
    ['(-) Gastos No Operacionales', report.gastos_no_operacionales.total, ''],
    ['= UTILIDAD ANTES DE IMPUESTO', report.utilidad_antes_impuesto, ''],
    ['(-) Impuesto de Renta', report.impuesto_renta.total, ''],
    ['= UTILIDAD NETA', report.utilidad_neta, pct(report.margen_neto_pct)],
  ];
  const blob = new Blob(['\uFEFF' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `pyg_${report.start_date}_${report.end_date}.csv` });
  a.click();
}

export default function IncomeStatement() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = `${today.substring(0, 4)}-01-01`;

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate,   setEndDate]   = useState(today);
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await reportsApi.getIncomeStatement({ start_date: startDate, end_date: endDate });
      setReport(res.data.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al generar'); }
    finally { setLoading(false); }
  }

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Estado de Resultados</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">P&G — Pérdidas y Ganancias</p>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
          </div>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 h-9 px-5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-60">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Generando...' : 'Generar'}
          </button>
          {report && (
            <button onClick={() => exportCSV(report)}
              className="flex items-center gap-2 h-9 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              <Download className="w-4 h-4" />CSV
            </button>
          )}
        </div>

        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cascada P&G */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Período: {report.start_date} — {report.end_date}
                </p>
              </div>

              <div className="py-2">
                {/* Ingresos */}
                <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/10">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Ingresos</span>
                </div>
                <Row label="Ingresos Operacionales" value={report.ingresos_operacionales.total} indent={1} />
                <AccountBlock accounts={report.ingresos_operacionales.accounts} />
                {report.ingresos_no_operacionales.total > 0 && <>
                  <Row label="Ingresos No Operacionales" value={report.ingresos_no_operacionales.total} indent={1} />
                  <AccountBlock accounts={report.ingresos_no_operacionales.accounts} />
                </>}
                <Row label="TOTAL INGRESOS" value={report.total_ingresos} bold color="text-emerald-600 dark:text-emerald-400" borderTop />

                {/* Costos */}
                <div className="px-4 py-1.5 bg-red-50 dark:bg-red-900/10 mt-2">
                  <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Costos y Gastos</span>
                </div>
                <Row label="(-) Costo de Ventas" value={report.costo_ventas.total} indent={1} color="text-red-600 dark:text-red-400" />
                <AccountBlock accounts={report.costo_ventas.accounts} />
                <Row label="= UTILIDAD BRUTA" value={report.utilidad_bruta} bold pctVal={report.margen_bruto_pct} borderTop
                  color={report.utilidad_bruta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />

                <Row label="(-) Gastos Operacionales" value={report.gastos_operacionales.total} indent={1} color="text-red-600 dark:text-red-400" />
                <AccountBlock accounts={report.gastos_operacionales.accounts} />
                <Row label="= UTILIDAD OPERACIONAL (EBIT)" value={report.utilidad_operacional} bold pctVal={report.margen_operacional_pct} borderTop
                  color={report.utilidad_operacional >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'} />

                {report.gastos_no_operacionales.total > 0 && <>
                  <Row label="(-) Gastos No Operacionales" value={report.gastos_no_operacionales.total} indent={1} color="text-red-600 dark:text-red-400" />
                  <AccountBlock accounts={report.gastos_no_operacionales.accounts} />
                </>}
                <Row label="= UTILIDAD ANTES DE IMPUESTO" value={report.utilidad_antes_impuesto} bold borderTop
                  color={report.utilidad_antes_impuesto >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'} />

                {report.impuesto_renta.total > 0 && <>
                  <Row label="(-) Impuesto de Renta" value={report.impuesto_renta.total} indent={1} color="text-red-600 dark:text-red-400" />
                </>}

                {/* Utilidad Neta */}
                <div className={`mx-3 my-2 p-4 rounded-lg ${report.utilidad_neta >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {report.utilidad_neta >= 0
                        ? <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        : <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />}
                      <span className={`text-base font-bold ${report.utilidad_neta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                        UTILIDAD NETA
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold font-mono ${report.utilidad_neta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                        {formatCOP(report.utilidad_neta)}
                      </p>
                      <p className="text-xs text-gray-400">Margen neto: {pct(report.margen_neto_pct)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de márgenes */}
            <div className="space-y-4">
              {[
                { label: 'Margen Bruto',      value: report.margen_bruto_pct,       amount: report.utilidad_bruta,      color: 'blue' },
                { label: 'Margen Operacional', value: report.margen_operacional_pct, amount: report.utilidad_operacional, color: 'indigo' },
                { label: 'EBITDA',             value: null,                          amount: report.ebitda,               color: 'violet' },
                { label: 'Margen Neto',        value: report.margen_neto_pct,        amount: report.utilidad_neta,        color: report.utilidad_neta >= 0 ? 'emerald' : 'red' },
              ].map(item => (
                <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                  <p className={`text-xl font-bold font-mono mt-1 text-${item.color}-600 dark:text-${item.color}-400`}>
                    {formatCOP(item.amount)}
                  </p>
                  {item.value !== null && (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full bg-${item.color}-500`}
                          style={{ width: `${Math.min(Math.abs(item.value), 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct(item.value)} de los ingresos</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </LayoutNew>
  );
}
