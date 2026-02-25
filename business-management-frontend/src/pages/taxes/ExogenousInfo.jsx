import { useState } from 'react';
import { Download, Search, FileText } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { taxesApi } from '../../api/modules/taxes';
import { showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

function exportCSV(rows, year, type) {
  const headers = ['Año', 'Cod.Concepto', 'Concepto', 'NIT', 'Nombre/Razón Social', 'Tipo Persona', 'Base Gravable', 'Impuesto/Retención', 'N° Registros'];
  const lines   = [
    headers.join(';'),
    ...rows.map(r => [
      r.year,
      r.concept_code,
      r.concept_name,
      r.nit,
      r.name,
      r.person_type === 'natural' ? 'Natural' : 'Jurídica',
      r.total_base,
      r.total_tax,
      r.entry_count,
    ].join(';')),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `info_exogena_${type}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExogenousInfo() {
  const [year, setYear]     = useState(new Date().getFullYear());
  const [type, setType]     = useState('retefuente');
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [search, setSearch] = useState('');

  async function generate() {
    setLoading(true);
    setGenerated(false);
    try {
      const res = await taxesApi.getExogenous({ year, type });
      setRows(res.data.data ?? []);
      setGenerated(true);
    } catch (err) { showError(err.response?.data?.message ?? 'Error al generar el reporte'); }
    finally { setLoading(false); }
  }

  const filtered = rows.filter(r =>
    !search
    || r.nit.includes(search)
    || r.name.toLowerCase().includes(search.toLowerCase())
    || r.concept_code.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filtered.reduce((acc, r) => ({
    base: acc.base + Number(r.total_base),
    tax:  acc.tax  + Number(r.total_tax),
    count: acc.count + r.entry_count,
  }), { base: 0, tax: 0, count: 0 });

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Información Exógena DIAN</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Reporte anual de retenciones practicadas agrupado por NIT y concepto
          </p>
        </div>

        {/* Panel de generación */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Año *</label>
              <input type="number" value={year} min={2020} max={2099}
                onChange={e => setYear(parseInt(e.target.value))}
                className={inputCls + ' w-24'} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Tipo de retención *</label>
              <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                <option value="retefuente">Retención en la Fuente</option>
                <option value="reteica">Retención ICA</option>
                <option value="reteiva">Retención IVA</option>
              </select>
            </div>
            <button onClick={generate} disabled={loading}
              className="flex items-center gap-2 h-9 px-5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-60">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {loading ? 'Generando...' : 'Generar Reporte'}
            </button>
          </div>
        </div>

        {/* Resultados */}
        {generated && (
          <>
            {/* Resumen + botón exportar */}
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Terceros', value: filtered.length, mono: false },
                  { label: 'Total Base Gravable', value: formatCOP(totals.base), mono: true },
                  { label: 'Total Retenido', value: formatCOP(totals.tax), mono: true, color: 'text-red-600 dark:text-red-400' },
                ].map(c => (
                  <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
                    <p className={`text-lg font-semibold mt-1 ${c.mono ? 'font-mono' : ''} ${c.color ?? 'text-gray-900 dark:text-white'}`}>{c.value}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => exportCSV(filtered, year, type)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
                <Download className="w-4 h-4" />Exportar CSV
              </button>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filtrar por NIT, nombre o concepto..."
                className="w-full pl-9 pr-3 h-9 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <FileText className="w-8 h-8 text-gray-300" />
                  <p className="text-sm text-gray-400">Sin registros para los filtros seleccionados</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      {['Cód.Concepto', 'Concepto', 'NIT', 'Nombre / Razón Social', 'Tipo', 'Base Gravable', 'Valor Retenido', 'Registros'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{r.concept_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{r.concept_name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{r.nit}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">{r.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${r.person_type === 'natural' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'}`}>
                            {r.person_type === 'natural' ? 'Natural' : 'Jurídica'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(r.total_base)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-red-600 dark:text-red-400">{formatCOP(r.total_tax)}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">{r.entry_count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                      <td colSpan={5} className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Total ({filtered.length} terceros)
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">{formatCOP(totals.base)}</td>
                      <td className="px-4 py-2.5 text-sm font-mono text-right font-semibold text-red-600 dark:text-red-400">{formatCOP(totals.tax)}</td>
                      <td className="px-4 py-2.5 text-sm text-center text-gray-500">{totals.count}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </LayoutNew>
  );
}
