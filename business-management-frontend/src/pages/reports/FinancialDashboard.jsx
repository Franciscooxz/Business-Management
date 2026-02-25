import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { reportsApi } from '../../api/modules/reports';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return `${Number(v).toFixed(2)}%`;
}

function fmtRatio(v, decimals = 2) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(decimals);
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({ title, value, subtitle, color, trend, footer, bar, barMax }) {
  const colorMap = {
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', sub: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    red:    { bg: 'bg-red-50 dark:bg-red-900/20',         border: 'border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-300',         sub: 'text-red-600 dark:text-red-400',         bar: 'bg-red-500'     },
    amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',     border: 'border-amber-200 dark:border-amber-800',     text: 'text-amber-700 dark:text-amber-300',     sub: 'text-amber-600 dark:text-amber-400',     bar: 'bg-amber-500'   },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',       border: 'border-blue-200 dark:border-blue-800',       text: 'text-blue-700 dark:text-blue-300',       sub: 'text-blue-600 dark:text-blue-400',       bar: 'bg-blue-500'    },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20',   border: 'border-purple-200 dark:border-purple-800',   text: 'text-purple-700 dark:text-purple-300',   sub: 'text-purple-600 dark:text-purple-400',   bar: 'bg-purple-500'  },
    gray:   { bg: 'bg-gray-50 dark:bg-gray-800',          border: 'border-gray-200 dark:border-gray-700',       text: 'text-gray-700 dark:text-gray-300',       sub: 'text-gray-500 dark:text-gray-400',       bar: 'bg-gray-400'    },
  };
  const c = colorMap[color] ?? colorMap.gray;
  const pct = (bar !== undefined && barMax) ? Math.min(100, Math.max(0, (bar / barMax) * 100)) : null;

  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-4 flex flex-col gap-2`}>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
      <div className="flex items-end justify-between gap-2">
        <span className={`text-2xl font-bold font-mono ${c.text}`}>{value}</span>
        {trend === 'up'   && <TrendingUp   className="w-5 h-5 text-emerald-500 shrink-0" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500 shrink-0"     />}
        {trend === 'flat' && <Minus        className="w-5 h-5 text-gray-400 shrink-0"    />}
      </div>
      {subtitle && <p className={`text-xs ${c.sub}`}>{subtitle}</p>}
      {pct !== null && (
        <div className="mt-1">
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${c.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {footer && <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-0.5">{footer}</p>}
    </div>
  );
}

/* ── Section Title ────────────────────────────────────────────── */
function SectionTitle({ title, subtitle }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h2>
      {subtitle && <span className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</span>}
    </div>
  );
}

/* ── Summary Row ──────────────────────────────────────────────── */
function SummaryRow({ label, value, bold, negative }) {
  return (
    <div className={`flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0 ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${bold ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
      <span className={`text-sm font-mono ${negative ? 'text-red-600 dark:text-red-400' : bold ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{value}</span>
    </div>
  );
}

/* ── Helpers de color ─────────────────────────────────────────── */
function liquidezColor(v) {
  if (v === null || v === undefined) return 'gray';
  if (v >= 2) return 'green';
  if (v >= 1) return 'amber';
  return 'red';
}

function endeudamientoColor(v) {
  if (v === null || v === undefined) return 'gray';
  if (v <= 0.4) return 'green';
  if (v <= 0.6) return 'amber';
  return 'red';
}

function margenColor(v) {
  if (v === null || v === undefined) return 'gray';
  if (v > 10) return 'green';
  if (v > 0)  return 'amber';
  return 'red';
}

/* ═══════════════════════════════════════════════════════════════ */
export default function FinancialDashboard() {
  const today    = new Date().toISOString().split('T')[0];
  const firstDay = `${today.substring(0, 4)}-01-01`;

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate,   setEndDate]   = useState(today);
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await reportsApi.getFinancialRatios({ start_date: startDate, end_date: endDate });
      setReport(res.data.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al generar'); }
    finally { setLoading(false); }
  }

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Indicadores Financieros</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ratios y KPIs calculados sobre el período seleccionado</p>
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
            {loading ? 'Calculando...' : 'Calcular'}
          </button>
        </div>

        {report && (
          <>
            {/* Aviso si datos insuficientes */}
            {report.warnings?.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {report.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* ── LIQUIDEZ ────────────────────────────────────────── */}
            <SectionTitle title="Liquidez y Solvencia" subtitle="Capacidad de cubrir obligaciones de corto plazo" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                title="Liquidez Corriente"
                value={fmtRatio(report.liquidez_corriente)}
                subtitle="Activo corriente / Pasivo corriente"
                color={liquidezColor(report.liquidez_corriente)}
                trend={report.liquidez_corriente >= 2 ? 'up' : report.liquidez_corriente >= 1 ? 'flat' : 'down'}
                footer={report.liquidez_corriente >= 2 ? 'Optimo: >= 2.0' : report.liquidez_corriente >= 1 ? 'Aceptable: >= 1.0' : 'Alerta: < 1.0 (riesgo de insolvencia)'}
                bar={report.liquidez_corriente}
                barMax={3}
              />
              <KpiCard
                title="Razon Acida"
                value={fmtRatio(report.razon_acida)}
                subtitle="(Activo corriente − Inventarios) / Pasivo corriente"
                color={report.razon_acida >= 1 ? 'green' : report.razon_acida >= 0.5 ? 'amber' : 'red'}
                trend={report.razon_acida >= 1 ? 'up' : 'down'}
                footer="Excluye inventarios (menos líquidos)"
                bar={report.razon_acida}
                barMax={3}
              />
              <KpiCard
                title="Endeudamiento"
                value={fmtPct((report.endeudamiento ?? 0) * 100)}
                subtitle="Total pasivo / Total activo"
                color={endeudamientoColor(report.endeudamiento)}
                trend={report.endeudamiento <= 0.4 ? 'up' : report.endeudamiento <= 0.6 ? 'flat' : 'down'}
                footer={`Óptimo: < 40% — Crítico: > 70%`}
                bar={(report.endeudamiento ?? 0) * 100}
                barMax={100}
              />
            </div>

            {/* ── RENTABILIDAD ────────────────────────────────────── */}
            <SectionTitle title="Rentabilidad" subtitle="Retorno sobre activos, patrimonio y márgenes de resultado" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="ROA"
                value={fmtPct(report.roa)}
                subtitle="Utilidad neta / Total activo"
                color={margenColor(report.roa)}
                trend={report.roa > 0 ? 'up' : 'down'}
                footer="Retorno sobre activos totales"
              />
              <KpiCard
                title="ROE"
                value={fmtPct(report.roe)}
                subtitle="Utilidad neta / Patrimonio"
                color={margenColor(report.roe)}
                trend={report.roe > 0 ? 'up' : 'down'}
                footer="Retorno sobre el patrimonio"
              />
              <KpiCard
                title="Margen Bruto"
                value={fmtPct(report.margen_bruto)}
                subtitle="Utilidad bruta / Ingresos"
                color={margenColor(report.margen_bruto)}
                trend={report.margen_bruto > 10 ? 'up' : 'flat'}
                bar={report.margen_bruto}
                barMax={100}
              />
              <KpiCard
                title="Margen Operacional"
                value={fmtPct(report.margen_operacional)}
                subtitle="Utilidad operacional / Ingresos"
                color={margenColor(report.margen_operacional)}
                trend={report.margen_operacional > 5 ? 'up' : 'flat'}
                bar={Math.max(0, report.margen_operacional ?? 0)}
                barMax={100}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                title="Margen Neto"
                value={fmtPct(report.margen_neto)}
                subtitle="Utilidad neta / Ingresos totales"
                color={margenColor(report.margen_neto)}
                trend={report.margen_neto > 0 ? 'up' : 'down'}
                bar={Math.max(0, report.margen_neto ?? 0)}
                barMax={100}
              />
              <KpiCard
                title="EBITDA"
                value={formatCOP(report.ebitda)}
                subtitle="Utilidad operacional + Depreciaciones"
                color={report.ebitda > 0 ? 'blue' : 'red'}
                trend={report.ebitda > 0 ? 'up' : 'down'}
              />
              <KpiCard
                title="Utilidad Neta"
                value={formatCOP(report.utilidad_neta)}
                subtitle={`Período: ${report.start_date} — ${report.end_date}`}
                color={report.utilidad_neta >= 0 ? 'green' : 'red'}
                trend={report.utilidad_neta >= 0 ? 'up' : 'down'}
              />
            </div>

            {/* ── ACTIVIDAD ───────────────────────────────────────── */}
            <SectionTitle title="Actividad y Eficiencia" subtitle="Velocidad de rotacion de activos operativos" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                title="Rotacion de Cartera"
                value={report.rotacion_cartera !== null && report.rotacion_cartera !== undefined ? `${fmtRatio(report.rotacion_cartera, 0)} dias` : '—'}
                subtitle="CxC / (Ingresos / 360)"
                color={report.rotacion_cartera <= 30 ? 'green' : report.rotacion_cartera <= 60 ? 'amber' : 'red'}
                trend={report.rotacion_cartera <= 30 ? 'up' : 'down'}
                footer="Óptimo: < 30 días — Crítico: > 60 días"
              />
              <KpiCard
                title="Rotacion de Inventarios"
                value={report.rotacion_inventarios !== null && report.rotacion_inventarios !== undefined ? `${fmtRatio(report.rotacion_inventarios, 0)} dias` : '—'}
                subtitle="Inventarios / (Costos / 360)"
                color={report.rotacion_inventarios <= 45 ? 'green' : report.rotacion_inventarios <= 90 ? 'amber' : 'red'}
                trend={report.rotacion_inventarios <= 45 ? 'up' : 'down'}
                footer="Óptimo: < 45 días"
              />
              <KpiCard
                title="Total Ingresos"
                value={formatCOP(report.total_ingresos)}
                subtitle={`${report.start_date} — ${report.end_date}`}
                color="blue"
              />
            </div>

            {/* ── RESUMEN BALANCE ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Resumen Balance</h3>
                <SummaryRow label="Activo Corriente"      value={formatCOP(report.activo_corriente)}      />
                <SummaryRow label="Activo No Corriente"   value={formatCOP(report.activo_no_corriente)}   />
                <SummaryRow label="Total Activo"          value={formatCOP(report.total_activo)}          bold />
                <div className="mt-3" />
                <SummaryRow label="Pasivo Corriente"      value={formatCOP(report.pasivo_corriente)}      />
                <SummaryRow label="Pasivo No Corriente"   value={formatCOP(report.pasivo_no_corriente)}   />
                <SummaryRow label="Total Pasivo"          value={formatCOP(report.total_pasivo)}          bold />
                <div className="mt-3" />
                <SummaryRow label="Patrimonio"            value={formatCOP(report.total_patrimonio)}      />
                <SummaryRow label="Resultado del Periodo" value={formatCOP(report.utilidad_neta)} negative={report.utilidad_neta < 0} />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Resumen P&G</h3>
                <SummaryRow label="Ingresos Operacionales"     value={formatCOP(report.ingresos_operacionales)}    />
                <SummaryRow label="Ingresos No Operacionales"  value={formatCOP(report.ingresos_no_operacionales)} />
                <SummaryRow label="Total Ingresos"             value={formatCOP(report.total_ingresos)}            bold />
                <div className="mt-3" />
                <SummaryRow label="Costos"                     value={formatCOP(report.total_costos)}     negative />
                <SummaryRow label="Gastos Operacionales"       value={formatCOP(report.gastos_operacionales)} negative />
                <SummaryRow label="Gastos No Operacionales"    value={formatCOP(report.gastos_no_operacionales)} negative />
                <div className="mt-3" />
                <SummaryRow label="Utilidad Bruta"             value={formatCOP(report.utilidad_bruta)}     bold negative={report.utilidad_bruta < 0}    />
                <SummaryRow label="Utilidad Operacional"       value={formatCOP(report.utilidad_operacional)} bold negative={report.utilidad_operacional < 0} />
                <SummaryRow label="Utilidad Neta"              value={formatCOP(report.utilidad_neta)}      bold negative={report.utilidad_neta < 0}     />
              </div>
            </div>

            {/* Leyenda de interpretación */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Guia de Interpretacion</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Verde:</span> indicador dentro del rango optimo para la mayoria de industrias colombianas.
                </div>
                <div>
                  <span className="font-medium text-amber-600 dark:text-amber-400">Amarillo:</span> indicador en rango de atencion — revisar tendencia historica.
                </div>
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">Rojo:</span> indicador fuera del rango aceptable — requiere accion correctiva.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </LayoutNew>
  );
}
