import { useState } from 'react';
import { Search, Download, CheckCircle, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { reportsApi } from '../../api/modules/reports';
import { showError } from '../../utils/toast';

const TYPE_LABELS = { activo:'Activo', pasivo:'Pasivo', patrimonio:'Patrimonio', ingreso:'Ingreso', gasto:'Gasto', costo:'Costo', orden:'Orden' };
const TYPE_COLORS = {
  activo:     'text-blue-600 dark:text-blue-400',
  pasivo:     'text-red-600 dark:text-red-400',
  patrimonio: 'text-purple-600 dark:text-purple-400',
  ingreso:    'text-emerald-600 dark:text-emerald-400',
  gasto:      'text-orange-600 dark:text-orange-400',
  costo:      'text-yellow-600 dark:text-yellow-400',
};

function formatCOP(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(Number(v)));
}

function exportCSV(data) {
  const headers = ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Nivel', 'Débitos', 'Créditos', 'Saldo'];
  const lines = [
    headers.join(';'),
    ...data.rows.map(r => [r.code, r.name, r.type, r.nature, r.level, r.total_debit, r.total_credit, r.balance].join(';')),
    ['', 'TOTALES', '', '', '', data.total_debit, data.total_credit, ''].join(';'),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `balance_prueba_${data.start_date}_${data.end_date}.csv` });
  a.click();
}

export default function TrialBalance() {
  const today     = new Date().toISOString().split('T')[0];
  const firstDay  = today.substring(0, 8) + '01';

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate,   setEndDate]   = useState(today);
  const [search,    setSearch]    = useState('');
  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await reportsApi.getTrialBalance({ start_date: startDate, end_date: endDate });
      setReport(res.data.data);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al generar'); }
    finally { setLoading(false); }
  }

  const filtered = report?.rows?.filter(r =>
    !search || r.code.includes(search) || r.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Balance de Prueba</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Balanza de comprobación por período</p>
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

        {/* Estado de cuadre */}
        {report && (
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${report.is_balanced ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            {report.is_balanced
              ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />}
            <span className={`text-sm font-medium ${report.is_balanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
              {report.is_balanced ? 'La balanza está cuadrada ✓' : `Diferencia de $${formatCOP(report.difference)} — revisar comprobantes`}
            </span>
          </div>
        )}

        {report && (
          <>
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filtrar por código o nombre de cuenta..."
                className="w-full pl-9 pr-3 h-9 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Código', 'Nombre', 'Tipo', 'Niv', 'Débitos', 'Créditos', 'Saldo'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-2.5 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{row.code}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white max-w-xs truncate">{row.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${TYPE_COLORS[row.type] ?? 'text-gray-500'}`}>
                          {TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-center text-gray-400">{row.level}</td>
                      <td className="px-4 py-2.5 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(row.total_debit)}</td>
                      <td className="px-4 py-2.5 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(row.total_credit)}</td>
                      <td className={`px-4 py-2.5 text-sm font-mono text-right font-semibold ${row.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
                        {row.balance < 0 ? '(' : ''}{formatCOP(row.balance)}{row.balance < 0 ? ')' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={4} className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">TOTALES ({filtered.length} cuentas)</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-right text-gray-900 dark:text-white">{formatCOP(report.total_debit)}</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-right text-gray-900 dark:text-white">{formatCOP(report.total_credit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </LayoutNew>
  );
}
