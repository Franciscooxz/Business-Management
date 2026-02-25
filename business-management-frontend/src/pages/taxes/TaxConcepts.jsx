import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Search } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { taxesApi } from '../../api/modules/taxes';
import { showSuccess, showError } from '../../utils/toast';

const TYPE_OPTIONS = [
  { value: '',            label: 'Todos los tipos' },
  { value: 'retefuente',  label: 'ReteFuente' },
  { value: 'reteica',     label: 'ReteICA' },
  { value: 'iva',         label: 'IVA' },
  { value: 'reteiva',     label: 'ReteIVA' },
  { value: 'ica',         label: 'ICA' },
];

const TYPE_COLORS = {
  retefuente: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  reteica:    'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  iva:        'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  reteiva:    'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
  ica:        'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
};

const TYPE_LABELS = {
  retefuente: 'ReteFuente',
  reteica:    'ReteICA',
  iva:        'IVA',
  reteiva:    'ReteIVA',
  ica:        'ICA',
};

const EMPTY = {
  code: '', name: '', type: 'retefuente', rate: '', minimum_base: '0',
  applies_to: 'purchase', account_code: '', is_active: true,
};

function ConceptModal({ initial, onClose, onSaved }) {
  const isNew = !initial;
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await taxesApi.createConcept(form);
        showSuccess('Concepto creado');
      } else {
        await taxesApi.updateConcept(initial.id, form);
        showSuccess('Concepto actualizado');
      }
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  }

  const inp = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {isNew ? 'Nuevo Concepto Tributario' : `Editar: ${initial.name}`}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Código *</label>
            <input value={form.code} onChange={e => set('code', e.target.value)}
              className={inp} required maxLength={10} placeholder="001" />
          </div>
          <div>
            <label className={lbl}>Tipo *</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inp} required>
              {TYPE_OPTIONS.filter(o => o.value).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Nombre / Descripción *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className={inp} required maxLength={150} />
          </div>
          <div>
            <label className={lbl}>Tasa (%) *</label>
            <input type="number" value={form.rate} step="0.01" min="0" max="100"
              onChange={e => set('rate', e.target.value)} className={inp} required />
          </div>
          <div>
            <label className={lbl}>Base Mínima ($)</label>
            <input type="number" value={form.minimum_base} step="1" min="0"
              onChange={e => set('minimum_base', e.target.value)} className={inp} />
            <p className="text-xs text-gray-400 mt-0.5">0 = aplica desde el primer peso</p>
          </div>
          <div>
            <label className={lbl}>Aplica a</label>
            <select value={form.applies_to} onChange={e => set('applies_to', e.target.value)} className={inp}>
              <option value="purchase">Compras</option>
              <option value="sale">Ventas</option>
              <option value="both">Ambos</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Cuenta PUC</label>
            <input value={form.account_code} onChange={e => set('account_code', e.target.value)}
              className={inp} maxLength={20} placeholder="236540" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Activo</label>
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2">
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

export default function TaxConcepts() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [showAll, setShowAll]   = useState(false);
  const [modal, setModal]       = useState(null); // null | 'new' | concept

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxesApi.getConcepts({ type: typeFilter || undefined, active_only: !showAll });
      setConcepts(res.data.data ?? []);
    } catch { showError('Error al cargar conceptos'); }
    finally { setLoading(false); }
  }, [typeFilter, showAll]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(concept) {
    if (!window.confirm(`¿Eliminar concepto "${concept.name}"?`)) return;
    try {
      await taxesApi.deleteConcept(concept.id);
      showSuccess('Concepto eliminado');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al eliminar'); }
  }

  const filtered = concepts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Conceptos Tributarios</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              ReteFuente, IVA, ReteICA y más
            </p>
          </div>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
            <Plus className="w-4 h-4" />Nuevo Concepto
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código o nombre..."
              className="w-full pl-9 pr-3 h-9 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 self-center">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            Ver inactivos
          </label>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Sin conceptos{search ? ' para esta búsqueda' : ''}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Código', 'Nombre', 'Tipo', 'Tasa', 'Base Mínima', 'Aplica a', 'Cuenta', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{c.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[c.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{c.rate}%</td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-500 dark:text-gray-400">
                      {Number(c.minimum_base) === 0 ? '—' : `$${Number(c.minimum_base).toLocaleString('es-CO')}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {c.applies_to === 'purchase' ? 'Compras' : c.applies_to === 'sale' ? 'Ventas' : 'Ambos'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">{c.account_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.is_active ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal(c)}
                          className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md text-gray-400 hover:text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
        <ConceptModal
          initial={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </LayoutNew>
  );
}
