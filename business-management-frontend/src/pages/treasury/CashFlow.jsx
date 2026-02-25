import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import LayoutNew from '../../components/layout/LayoutNew';
import { treasuryApi } from '../../api/modules/treasury';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1_000_000) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', notation: 'compact', maximumFractionDigits: 1,
    }).format(n);
  }
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(n);
}

function formatCOPFull(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(v));
}

function SummaryCard({ label, value, icon: Icon, iconBg, iconColor, valueColor }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <p className={`text-xl font-bold mt-1 font-mono truncate ${valueColor}`}>{formatCOPFull(value)}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs space-y-1">
      <p className="font-medium text-gray-700 dark:text-gray-300">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCOPFull(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CashFlow() {
  const today    = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const [from, setFrom]       = useState(firstDay);
  const [to, setTo]           = useState(lastDay);
  const [cfData, setCfData]   = useState(null);
  const [banks, setBanks]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfRes, bankRes] = await Promise.all([
        treasuryApi.getCashFlow({ from, to }),
        treasuryApi.getBankAccounts(),
      ]);
      setCfData(cfRes.data);
      const raw = bankRes.data?.data ?? bankRes.data ?? [];
      setBanks(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch {
      showError('Error al cargar flujo de caja');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const summary   = cfData?.summary ?? {};
  const movements = cfData?.movements ?? [];
  const projections = cfData?.projections ?? null;

  // Agrupar movimientos por fecha para el gráfico
  const chartMap = movements.reduce((acc, m) => {
    const d = m.movement_date;
    if (!acc[d]) acc[d] = { date: d, ingresos: 0, egresos: 0 };
    if (m.type === 'ingreso') acc[d].ingresos += Number(m.net_amount ?? m.amount ?? 0);
    if (m.type === 'egreso')  acc[d].egresos  += Number(m.net_amount ?? m.amount ?? 0);
    return acc;
  }, {});
  const chartRows = Object.values(chartMap).sort((a, b) => a.date.localeCompare(b.date));

  const totalBalances = banks.reduce((s, b) => s + Number(b.current_balance ?? 0), 0);
  const netFlow = Number(summary.total_income ?? 0) - Number(summary.total_expenses ?? 0);

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Flujo de Caja</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Análisis de ingresos y egresos</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="h-8 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date" value={to} onChange={e => setTo(e.target.value)}
              className="h-8 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Saldo Total Bancos"
            value={totalBalances}
            icon={Wallet}
            iconBg="bg-primary-50 dark:bg-primary-900/20"
            iconColor="text-primary-600 dark:text-primary-400"
            valueColor="text-gray-900 dark:text-white"
          />
          <SummaryCard
            label="Ingresos del Período"
            value={summary.total_income ?? 0}
            icon={TrendingUp}
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            valueColor="text-emerald-700 dark:text-emerald-400"
          />
          <SummaryCard
            label="Egresos del Período"
            value={summary.total_expenses ?? 0}
            icon={TrendingDown}
            iconBg="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-500 dark:text-red-400"
            valueColor="text-red-600 dark:text-red-400"
          />
          <SummaryCard
            label="Flujo Neto"
            value={netFlow}
            icon={netFlow >= 0 ? TrendingUp : TrendingDown}
            iconBg={netFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}
            iconColor={netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}
            valueColor={netFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          />
        </div>

        {/* Bank Balances */}
        {banks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {banks.map(b => (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
                  {b.name}
                </p>
                <p className={`text-xl font-bold font-mono mt-1 ${
                  Number(b.current_balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCOPFull(b.current_balance)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                  {b.type?.replace('_', ' ')} · {b.bank_name ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Movimientos por Día</h2>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Cargando...</div>
          ) : chartRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin movimientos en el período seleccionado</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartRows} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => formatCOP(v)}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="egresos"  name="Egresos"  fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Proyecciones CxC / CxP */}
        {projections && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">CxC Pendiente por Cobrar</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Entradas proyectadas</p>
              <p className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {formatCOPFull(projections.ar_pending)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">CxP Pendiente por Pagar</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Salidas proyectadas</p>
              <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                {formatCOPFull(projections.ap_pending)}
              </p>
            </div>
          </div>
        )}
      </div>
    </LayoutNew>
  );
}
