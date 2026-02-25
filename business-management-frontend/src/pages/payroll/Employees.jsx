import { useEffect, useState, useCallback } from 'react';
import {
  Users2, Plus, Search, X, Edit2, Trash2, AlertCircle,
  ChevronLeft, ChevronRight, Briefcase,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { payrollApi } from '../../api/modules/payroll';
import { showSuccess, showError } from '../../utils/toast';

const CONTRACT_LABELS = {
  indefinido: 'Indefinido', fijo: 'Fijo', obra_labor: 'Obra/Labor', aprendizaje: 'Aprendizaje',
};
const STATUS_CONFIG = {
  activo:   { label: 'Activo',   dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  inactivo: { label: 'Inactivo', dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
  retirado: { label: 'Retirado', dot: 'bg-gray-400',    text: 'text-gray-600 dark:text-gray-400',       bg: 'bg-gray-100 dark:bg-gray-700' },
};

function formatCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v ?? 0));
}

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.activo;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

const EMPTY = {
  code: '', first_name: '', last_name: '', document_type: 'CC', document_number: '',
  email: '', phone: '', birth_date: '', hire_date: '', contract_type: 'indefinido',
  position: '', department: '', base_salary: '',
  eps_name: '', afp_name: '', arl_name: '', arl_risk_level: 1, compensation_fund: '',
  bank_name: '', bank_account_number: '', bank_account_type: 'ahorros',
  notes: '',
};

function EmployeeModal({ employee, onClose, onSaved }) {
  const [form, setForm]   = useState(employee ? { ...employee } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState('personal');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (employee) {
        await payrollApi.updateEmployee(employee.id, form);
        showSuccess('Empleado actualizado');
      } else {
        await payrollApi.createEmployee(form);
        showSuccess('Empleado creado');
      }
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  }

  const inputCls = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  const tabs = [
    { id: 'personal', label: 'Datos Personales' },
    { id: 'contract', label: 'Contrato y Salario' },
    { id: 'ss', label: 'Seguridad Social' },
    { id: 'bank', label: 'Cuenta Bancaria' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {employee ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="p-6">
          {/* Personal */}
          {tab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Código</label>
                <input value={form.code} onChange={e => set('code', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tipo Doc.</label>
                <select value={form.document_type} onChange={e => set('document_type', e.target.value)} className={inputCls}>
                  {['CC','CE','PA','TI'].map(v => <option key={v}>{v}</option>)}
                </select></div>
              <div><label className={labelCls}>Nombres *</label>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Apellidos *</label>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Número Documento *</label>
                <input value={form.document_number} onChange={e => set('document_number', e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Fecha de Nacimiento</label>
                <input type="date" value={form.birth_date ?? ''} onChange={e => set('birth_date', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Email</label>
                <input type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Teléfono</label>
                <input value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} className={inputCls} /></div>
            </div>
          )}

          {/* Contrato */}
          {tab === 'contract' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Tipo de Contrato *</label>
                <select value={form.contract_type} onChange={e => set('contract_type', e.target.value)} className={inputCls}>
                  {Object.entries(CONTRACT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div><label className={labelCls}>Fecha de Ingreso *</label>
                <input type="date" value={form.hire_date ?? ''} onChange={e => set('hire_date', e.target.value)} className={inputCls} required /></div>
              <div><label className={labelCls}>Fecha de Retiro</label>
                <input type="date" value={form.termination_date ?? ''} onChange={e => set('termination_date', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Salario Base (COP) *</label>
                <input type="number" min="0" step="1000" value={form.base_salary} onChange={e => set('base_salary', e.target.value)} className={`${inputCls} text-right font-mono`} required /></div>
              <div><label className={labelCls}>Cargo</label>
                <input value={form.position ?? ''} onChange={e => set('position', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Área / Departamento</label>
                <input value={form.department ?? ''} onChange={e => set('department', e.target.value)} className={inputCls} /></div>
              {employee && <div><label className={labelCls}>Estado</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                  {['activo','inactivo','retirado'].map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                </select></div>}
              <div className="col-span-2"><label className={labelCls}>Notas</label>
                <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" /></div>
            </div>
          )}

          {/* Seguridad Social */}
          {tab === 'ss' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>EPS</label>
                <input value={form.eps_name ?? ''} onChange={e => set('eps_name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>AFP (Pensión)</label>
                <input value={form.afp_name ?? ''} onChange={e => set('afp_name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>ARL</label>
                <input value={form.arl_name ?? ''} onChange={e => set('arl_name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Nivel Riesgo ARL (1-5)</label>
                <select value={form.arl_risk_level} onChange={e => set('arl_risk_level', e.target.value)} className={inputCls}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>Nivel {n} — {['0.52%','1.04%','2.44%','4.35%','6.96%'][n-1]}</option>)}
                </select></div>
              <div className="col-span-2"><label className={labelCls}>Caja de Compensación Familiar</label>
                <input value={form.compensation_fund ?? ''} onChange={e => set('compensation_fund', e.target.value)} className={inputCls} /></div>
            </div>
          )}

          {/* Banco */}
          {tab === 'bank' && (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelCls}>Banco</label>
                <input value={form.bank_name ?? ''} onChange={e => set('bank_name', e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Tipo de Cuenta</label>
                <select value={form.bank_account_type ?? 'ahorros'} onChange={e => set('bank_account_type', e.target.value)} className={inputCls}>
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select></div>
              <div className="col-span-2"><label className={labelCls}>Número de Cuenta</label>
                <input value={form.bank_account_number ?? ''} onChange={e => set('bank_account_number', e.target.value)} className={`${inputCls} font-mono`} /></div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const [data, setData]         = useState({ data: [], meta: {} });
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('activo');
  const [modal, setModal]       = useState(null); // null | 'new' | employee object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getEmployees({ page, per_page: 20, status: status || undefined, search: search || undefined });
      setData(res.data);
    } catch { showError('Error al cargar empleados'); }
    finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const { data: rows = [], meta = {} } = data;

  async function handleDelete(e) {
    if (!confirm(`¿Eliminar a ${e.first_name} ${e.last_name}?`)) return;
    try {
      await payrollApi.deleteEmployee(e.id);
      showSuccess('Empleado eliminado');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al eliminar'); }
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Empleados</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{meta.total ?? 0} empleados registrados</p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />Nuevo Empleado
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar empleado..."
                className="h-8 pl-9 pr-3 w-52 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex gap-1">
              {['', 'activo', 'inactivo', 'retirado'].map(s => (
                <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${status === s ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                  {s || 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Users2 className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin empleados registrados</p>
              <button onClick={() => setModal('new')} className="text-sm text-primary-600 hover:underline">Agregar primero</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Empleado', 'Documento', 'Cargo', 'Contrato', 'Salario Base', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.first_name} {emp.last_name}</p>
                          {emp.code && <p className="text-xs text-gray-400 dark:text-gray-500">#{emp.code}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">{emp.document_type} {emp.document_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {emp.position ?? '—'}
                        {emp.department && <p className="text-xs text-gray-400 dark:text-gray-500">{emp.department}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{CONTRACT_LABELS[emp.contract_type] ?? emp.contract_type}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-gray-900 dark:text-white">{formatCOP(emp.base_salary)}</td>
                      <td className="px-4 py-3"><StatusChip status={emp.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal(emp)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-gray-500 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(emp)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {modal !== null && (
        <EmployeeModal
          employee={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </LayoutNew>
  );
}
