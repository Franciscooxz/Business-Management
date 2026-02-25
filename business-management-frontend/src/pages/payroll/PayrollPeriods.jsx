import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, AlertCircle, ChevronLeft, ChevronRight, Eye, Calculator,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { payrollApi } from '../../api/modules/payroll';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

const STATUS_CONFIG = {
  borrador:   { label: 'Borrador',   dot: 'bg-gray-400',    text: 'text-gray-600 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-700' },
  calculado:  { label: 'Calculado',  dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
  pagado:     { label: 'Pagado',     dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  anulado:    { label: 'Anulado',    dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
};

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.borrador;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

const today = new Date().toISOString().split('T')[0];
const EMPTY_PERIOD = {
  name: '', period_type: 'mensual',
  start_date: today, end_date: today, payment_date: today, notes: '',
};

function NewPeriodModal({ onClose, onSaved }) {
  const [form, setForm]   = useState({ ...EMPTY_PERIOD });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await payrollApi.createPeriod(form);
      showSuccess('Período creado');
      onSaved();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al crear período'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nuevo Período de Nómina</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Nómina Febrero 2025" className={inputCls} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo</label>
              <select value={form.period_type} onChange={e => set('period_type', e.target.value)} className={inputCls}>
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Fecha de Pago *</label>
              <input type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Inicio Período *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Fin Período *</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">{saving ? 'Creando...' : 'Crear Período'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayrollPeriods() {
  const navigate = useNavigate();
  const [data, setData]       = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [showModal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getPeriods({ page, per_page: 15 });
      setData(res.data);
    } catch { showError('Error al cargar períodos'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const { data: rows = [], meta = {} } = data;

  async function handleCalculate(period) {
    if (period.status === 'pagado') return;
    try {
      await payrollApi.calculatePeriod(period.id, { extras: [] });
      showSuccess('Período calculado');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al calcular'); }
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Períodos de Nómina</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Liquidación mensual / quincenal</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />Nuevo Período
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin períodos de nómina</p>
              <button onClick={() => setModal(true)} className="text-sm text-primary-600 hover:underline">Crear primero</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Período', 'Tipo', 'Rango', 'Empleados', 'Devengado', 'Deducciones', 'Neto a Pagar', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Pago: {p.payment_date}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{p.period_type}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{p.start_date} → {p.end_date}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{p.employee_count}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(p.total_devengado)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-red-600 dark:text-red-400">{formatCOP(p.total_deducciones)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-emerald-700 dark:text-emerald-400">{formatCOP(p.total_neto)}</td>
                      <td className="px-4 py-3"><StatusChip status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.status !== 'pagado' && p.status !== 'anulado' && (
                            <button onClick={() => handleCalculate(p)} title="Calcular" className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => navigate(`/payroll/periods/${p.id}`)} title="Ver detalle" className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-gray-500 hover:text-gray-700">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Página {meta.current_page} de {meta.last_page}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage(p => Math.min(meta.last_page, p+1))} disabled={page >= meta.last_page} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showModal && <NewPeriodModal onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </LayoutNew>
  );
}
