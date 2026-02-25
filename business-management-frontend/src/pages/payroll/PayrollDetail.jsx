import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calculator, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { payrollApi } from '../../api/modules/payroll';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (v === null || v === undefined || Number(v) === 0) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

const STATUS_CONFIG = {
  borrador:  { label: 'Borrador',  cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  calculado: { label: 'Calculado', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  pagado:    { label: 'Pagado',    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  anulado:   { label: 'Anulado',   cls: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
};

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-xl font-bold font-mono mt-1 ${color}`}>{formatCOP(value) === '—' ? formatCOP(value) : formatCOP(value)}</p>
    </div>
  );
}

function ExtrasModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    worked_days: item.worked_days ?? 30,
    overtime_diurnal_hours: 0,
    overtime_nocturnal_hours: 0,
    overtime_holiday_hours: 0,
    commissions: item.commissions ?? 0,
    bonuses: item.bonuses ?? 0,
    other_income: item.other_income ?? 0,
    loans_deduction: item.loans_deduction ?? 0,
    other_deductions: item.other_deductions ?? 0,
  });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await payrollApi.updateItem(item.payroll_period_id, item.id, form);
      showSuccess('Item actualizado y recalculado');
      onSaved();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al actualizar'); }
    finally { setSaving(false); }
  }

  const inputCls = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-xs text-gray-600 dark:text-gray-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Editar Conceptos</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.employee?.first_name} {item.employee?.last_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Días Trabajados</label>
              <input type="number" min="0" max="30" step="0.5" value={form.worked_days} onChange={e => set('worked_days', e.target.value)} className={inputCls} />
            </div>
            <p className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Horas Extra</p>
            <div><label className={labelCls}>HED Diurnas (+25%)</label>
              <input type="number" min="0" step="0.5" value={form.overtime_diurnal_hours} onChange={e => set('overtime_diurnal_hours', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>HEN Nocturnas (+75%)</label>
              <input type="number" min="0" step="0.5" value={form.overtime_nocturnal_hours} onChange={e => set('overtime_nocturnal_hours', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>HED Dominicales (+100%)</label>
              <input type="number" min="0" step="0.5" value={form.overtime_holiday_hours} onChange={e => set('overtime_holiday_hours', e.target.value)} className={inputCls} /></div>

            <p className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ingresos Adicionales</p>
            <div><label className={labelCls}>Comisiones</label>
              <input type="number" min="0" step="1000" value={form.commissions} onChange={e => set('commissions', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Bonificaciones</label>
              <input type="number" min="0" step="1000" value={form.bonuses} onChange={e => set('bonuses', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Otros Ingresos</label>
              <input type="number" min="0" step="1000" value={form.other_income} onChange={e => set('other_income', e.target.value)} className={inputCls} /></div>

            <p className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Deducciones Adicionales</p>
            <div><label className={labelCls}>Préstamos / Libranzas</label>
              <input type="number" min="0" step="1000" value={form.loans_deduction} onChange={e => set('loans_deduction', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Otras Deducciones</label>
              <input type="number" min="0" step="1000" value={form.other_deductions} onChange={e => set('other_deductions', e.target.value)} className={inputCls} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">{saving ? 'Recalculando...' : 'Guardar y Recalcular'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ItemRow({ item, editable, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const name = `${item.employee?.first_name ?? ''} ${item.employee?.last_name ?? ''}`.trim();

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
            <p className="text-xs text-gray-400">{item.employee?.position ?? ''}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-mono text-center text-gray-600 dark:text-gray-300">{item.worked_days}</td>
        <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(item.basic_salary)}</td>
        <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(item.total_devengado)}</td>
        <td className="px-4 py-3 text-sm font-mono text-right text-red-600 dark:text-red-400">{formatCOP(item.total_deducciones)}</td>
        <td className="px-4 py-3 text-sm font-mono text-right font-bold text-emerald-700 dark:text-emerald-400">{formatCOP(item.net_pay)}</td>
        <td className="px-4 py-3 text-sm font-mono text-right text-amber-700 dark:text-amber-400">{formatCOP(item.total_aportes_patronales)}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setExpanded(v => !v)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-gray-500" title="Ver detalle">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {editable && (
              <button onClick={() => onEdit(item)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md text-gray-400 hover:text-blue-600" title="Editar conceptos">
                <Calculator className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-700/20">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-6 text-xs">
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Devengados</p>
                {[
                  ['Salario Básico', item.basic_salary],
                  ['Auxilio Transporte', item.transport_allowance],
                  ['HE Diurnas', item.overtime_diurnal],
                  ['HE Nocturnas', item.overtime_nocturnal],
                  ['HE Dominicales', item.overtime_holiday],
                  ['Comisiones', item.commissions],
                  ['Bonificaciones', item.bonuses],
                  ['Otros Ingresos', item.other_income],
                ].filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>{l}</span><span className="font-mono">{formatCOP(v)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Deducciones</p>
                {[
                  ['Salud (4%)', item.health_employee],
                  ['Pensión (4%)', item.pension_employee],
                  ['Fondo Solidaridad (1%)', item.solidarity_fund],
                  ['Préstamos', item.loans_deduction],
                  ['Otras Ded.', item.other_deductions],
                ].filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>{l}</span><span className="font-mono text-red-600 dark:text-red-400">{formatCOP(v)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Aportes Patronales</p>
                {[
                  ['Salud (8.5%)', item.health_employer],
                  ['Pensión (12%)', item.pension_employer],
                  ['ARL', item.arl],
                  ['SENA (2%)', item.sena],
                  ['ICBF (3%)', item.icbf],
                  ['Caja Comp. (4%)', item.compensation_fund],
                ].filter(([, v]) => Number(v) > 0).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>{l}</span><span className="font-mono text-amber-700 dark:text-amber-400">{formatCOP(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PayrollDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [period, setPeriod]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editItem, setEdit]   = useState(null);
  const [calculating, setCalc]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getPeriod(id);
      setPeriod(res.data.data);
    } catch { showError('Error al cargar período'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleCalculate() {
    setCalc(true);
    try {
      await payrollApi.calculatePeriod(id, { extras: [] });
      showSuccess('Período calculado correctamente');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al calcular'); }
    finally { setCalc(false); }
  }

  async function handleCancel() {
    if (!confirm('¿Anular este período? Esta acción no se puede deshacer.')) return;
    try {
      await payrollApi.cancelPeriod(id);
      showSuccess('Período anulado');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al anular'); }
  }

  if (loading) {
    return (
      <LayoutNew>
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
      </LayoutNew>
    );
  }

  if (!period) return <LayoutNew><p className="text-sm text-gray-500">Período no encontrado.</p></LayoutNew>;

  const s = STATUS_CONFIG[period.status] ?? STATUS_CONFIG.borrador;
  const editable = !['pagado', 'anulado'].includes(period.status);
  const items = period.items ?? [];

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/payroll/periods')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md mt-0.5">
              <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{period.name}</h1>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {period.start_date} → {period.end_date} · Pago: {period.payment_date}
              </p>
            </div>
          </div>
          {editable && (
            <div className="flex gap-2">
              <button onClick={handleCalculate} disabled={calculating}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60">
                <Calculator className="w-4 h-4" />
                {calculating ? 'Calculando...' : 'Calcular Todos'}
              </button>
              <button onClick={handleCancel}
                className="px-3 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                Anular
              </button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Empleados</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{period.employee_count}</p>
          </div>
          <SummaryCard label="Total Devengado"  value={period.total_devengado}          color="text-gray-900 dark:text-white" />
          <SummaryCard label="Deducciones"      value={period.total_deducciones}        color="text-red-600 dark:text-red-400" />
          <SummaryCard label="Neto a Pagar"     value={period.total_neto}               color="text-emerald-700 dark:text-emerald-400" />
          <SummaryCard label="Aportes Patr."    value={period.total_aportes_patronales} color="text-amber-700 dark:text-amber-400" />
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Detalle por Empleado</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Haz clic en ▾ para ver desglose completo</p>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-sm text-gray-400 gap-1">
              <p>Sin empleados calculados aún.</p>
              {editable && <button onClick={handleCalculate} className="text-primary-600 hover:underline text-xs">Calcular ahora</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Empleado', 'Días', 'Salario Básico', 'Total Devengado', 'Deducciones', 'Neto a Pagar', 'Aportes Patr.', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map(item => (
                    <ItemRow key={item.id} item={item} editable={editable} onEdit={setEdit} />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                    <td className="px-4 py-2.5 text-xs text-gray-500 uppercase" colSpan={3}>Totales</td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCOP(period.total_devengado)}</td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-red-600 dark:text-red-400">{formatCOP(period.total_deducciones)}</td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-emerald-700 dark:text-emerald-400">{formatCOP(period.total_neto)}</td>
                    <td className="px-4 py-2.5 text-sm font-mono text-right text-amber-700 dark:text-amber-400">{formatCOP(period.total_aportes_patronales)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {editItem && (
        <ExtrasModal
          item={editItem}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }}
        />
      )}
    </LayoutNew>
  );
}
