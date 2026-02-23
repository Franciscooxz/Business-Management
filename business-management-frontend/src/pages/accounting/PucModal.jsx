import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { accountingApi } from '../../api/modules/accounting';
import { showSuccess, showError } from '../../utils/toast';

const EMPTY = {
  code: '',
  name: '',
  description: '',
  nature: 'debito',
  type: 'activo',
  level: 1,
  parent_id: null,
  allows_entries: true,
  requires_third_party: false,
  requires_cost_center: false,
};

export default function PucModal({ account, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [parentOptions, setParentOptions] = useState([]);
  const isEdit = !!account;

  useEffect(() => {
    if (account) {
      setForm({ ...EMPTY, ...account, parent_id: account.parent_id ?? null });
    }
  }, [account]);

  // Búsqueda de cuenta padre
  useEffect(() => {
    if (!parentSearch.trim()) { setParentOptions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await accountingApi.getPucList({ search: parentSearch, per_page: 20 });
        setParentOptions(res.data.data ?? []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [parentSearch]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      showError('Código y nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await accountingApi.updatePucAccount(account.id, form);
        showSuccess('Cuenta actualizada');
      } else {
        await accountingApi.createPucAccount(form);
        showSuccess('Cuenta creada');
      }
      onClose();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Cuenta PUC' : 'Nueva Cuenta PUC'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                className="input h-9 text-sm font-mono"
                placeholder="1105"
                required
              />
            </div>
            <div>
              <label className="label">Nivel</label>
              <select
                value={form.level}
                onChange={(e) => set('level', parseInt(e.target.value))}
                className="input h-9 text-sm"
              >
                <option value={1}>1 — Clase</option>
                <option value={2}>2 — Grupo</option>
                <option value={3}>3 — Cuenta</option>
                <option value={4}>4 — Subcuenta</option>
                <option value={5}>5 — Auxiliar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="input h-9 text-sm"
              placeholder="Caja General"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Naturaleza</label>
              <select
                value={form.nature}
                onChange={(e) => set('nature', e.target.value)}
                className="input h-9 text-sm"
              >
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className="input h-9 text-sm"
              >
                <option value="activo">Activo</option>
                <option value="pasivo">Pasivo</option>
                <option value="patrimonio">Patrimonio</option>
                <option value="ingreso">Ingreso</option>
                <option value="gasto">Gasto</option>
                <option value="costo">Costo</option>
                <option value="orden">Cuentas de Orden</option>
              </select>
            </div>
          </div>

          {/* Cuenta padre */}
          <div>
            <label className="label">Cuenta Padre (opcional)</label>
            <div className="relative">
              <input
                type="text"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="input h-9 text-sm"
                placeholder="Buscar por código o nombre..."
              />
              {parentOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {parentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        set('parent_id', opt.id);
                        setParentSearch(`${opt.code} — ${opt.name}`);
                        setParentOptions([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="font-mono text-xs text-gray-500 mr-2">{opt.code}</span>
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.parent_id && (
              <button
                type="button"
                onClick={() => { set('parent_id', null); setParentSearch(''); }}
                className="text-xs text-gray-400 hover:text-red-500 mt-1"
              >
                Quitar cuenta padre
              </button>
            )}
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            {[
              { key: 'allows_entries', label: 'Permite registrar movimientos (cuenta auxiliar)' },
              { key: 'requires_third_party', label: 'Requiere tercero en los movimientos' },
              { key: 'requires_cost_center', label: 'Requiere centro de costo' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
