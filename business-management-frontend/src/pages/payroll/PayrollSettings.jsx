import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Check, Trash2, AlertCircle } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { payrollApi } from '../../api/modules/payroll';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(v));
}

const EMPTY_FORM = { year: new Date().getFullYear(), smmlv: '', transport_allowance: '', is_active: false };

function SettingModal({ initial, onClose, onSaved }) {
  const isNew = !initial;
  const [form, setForm] = useState(
    initial
      ? { year: initial.year, smmlv: initial.smmlv, transport_allowance: initial.transport_allowance, is_active: initial.is_active }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await payrollApi.createSetting(form);
        showSuccess('Configuración creada');
      } else {
        await payrollApi.updateSetting(initial.id, form);
        showSuccess('Configuración actualizada');
      }
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono';
  const labelCls = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isNew ? 'Nueva Configuración' : `Editar Configuración ${initial.year}`}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Año *</label>
            <input
              type="number" value={form.year} min={2020} max={2099}
              onChange={e => set('year', parseInt(e.target.value))}
              className={inputCls} required
            />
          </div>
          <div>
            <label className={labelCls}>SMMLV ($ COP) *</label>
            <input
              type="number" value={form.smmlv} min={1} step={100}
              onChange={e => set('smmlv', e.target.value)}
              placeholder="1423500" className={inputCls} required
            />
            <p className="text-xs text-gray-400 mt-0.5">Salario Mínimo Mensual Legal Vigente</p>
          </div>
          <div>
            <label className={labelCls}>Auxilio de Transporte ($ COP) *</label>
            <input
              type="number" value={form.transport_allowance} min={0} step={100}
              onChange={e => set('transport_allowance', e.target.value)}
              placeholder="202000" className={inputCls} required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              Marcar como configuración activa
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Guardando...' : (isNew ? 'Crear' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayrollSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'new' | setting object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollApi.getSettings();
      setSettings(res.data.data ?? []);
    } catch {
      showError('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleActivate(setting) {
    try {
      await payrollApi.activateSetting(setting.id);
      showSuccess(`Configuración ${setting.year} activada`);
      load();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al activar');
    }
  }

  async function handleDelete(setting) {
    if (!window.confirm(`¿Eliminar configuración ${setting.year}?`)) return;
    try {
      await payrollApi.deleteSetting(setting.id);
      showSuccess('Configuración eliminada');
      load();
    } catch (err) {
      showError(err.response?.data?.message ?? 'No se puede eliminar');
    }
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Configuración de Nómina</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              SMMLV y Auxilio de Transporte por año
            </p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />Nuevo Año
          </button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Solo una configuración puede estar activa a la vez. El sistema usa los valores activos para
            calcular las deducciones de salud, pensión y el auxilio de transporte.
          </p>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : settings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin configuraciones registradas</p>
              <button onClick={() => setModal('new')} className="text-sm text-primary-600 hover:underline">
                Crear primera configuración
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Año', 'SMMLV', 'Auxilio de Transporte', 'Límite 2 SMMLV', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {settings.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {s.year}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">
                      {formatCOP(s.smmlv)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">
                      {formatCOP(s.transport_allowance)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-500 dark:text-gray-400">
                      {formatCOP(s.smmlv * 2)}
                    </td>
                    <td className="px-4 py-3">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!s.is_active && (
                          <button
                            onClick={() => handleActivate(s)}
                            title="Activar"
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setModal(s)}
                          title="Editar"
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                          <Plus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                        {!s.is_active && (
                          <button
                            onClick={() => handleDelete(s)}
                            title="Eliminar"
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <SettingModal
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </LayoutNew>
  );
}
