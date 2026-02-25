import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, X, Trash2, Search, Filter } from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { taxesApi } from '../../api/modules/taxes';
import { showSuccess, showError } from '../../utils/toast';

const DIR_OPTIONS  = [
  { value: '',           label: 'Todas' },
  { value: 'practicada', label: 'Practicadas (retenemos)' },
  { value: 'sufrida',    label: 'Sufridas (nos retienen)' },
];

const DIR_COLORS = {
  practicada: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  sufrida:    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};

function formatCOP(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

function EntryModal({ concepts, onClose, onSaved }) {
  const [form, setForm] = useState({
    tax_concept_id: '', document_date: new Date().toISOString().split('T')[0],
    document_number: '', base_amount: '', direction: 'practicada',
    reference: '', notes: '',
  });
  const [calcTax, setCalcTax] = useState(null);
  const [saving, setSaving]   = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  // Calcular previsualización del impuesto
  useEffect(() => {
    if (!form.tax_concept_id || !form.base_amount) { setCalcTax(null); return; }
    const concept = concepts.find(c => c.id === parseInt(form.tax_concept_id));
    if (!concept) { setCalcTax(null); return; }
    const base = parseFloat(form.base_amount) || 0;
    const min  = parseFloat(concept.minimum_base) || 0;
    if (base < min) { setCalcTax({ tax: 0, note: `Base < mínima ($${min.toLocaleString('es-CO')})` }); return; }
    setCalcTax({ tax: Math.round(base * (concept.rate / 100)), note: `${concept.rate}% de ${formatCOP(base)}` });
  }, [form.tax_concept_id, form.base_amount, concepts]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await taxesApi.createWithholding(form);
      showSuccess('Retención registrada');
      onSaved();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al guardar'); }
    finally { setSaving(false); }
  }

  const inp = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Registrar Retención</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Concepto tributario *</label>
              <select value={form.tax_concept_id} onChange={e => set('tax_concept_id', e.target.value)} className={inp} required>
                <option value="">— Seleccionar —</option>
                {concepts.map(c => (
                  <option key={c.id} value={c.id}>{c.code} – {c.name} ({c.rate}%)</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Dirección *</label>
              <select value={form.direction} onChange={e => set('direction', e.target.value)} className={inp} required>
                <option value="practicada">Practicada (retenemos a tercero)</option>
                <option value="sufrida">Sufrida (nos retienen a nosotros)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Fecha del documento *</label>
              <input type="date" value={form.document_date} onChange={e => set('document_date', e.target.value)}
                className={inp} required />
            </div>
            <div>
              <label className={lbl}>N° Documento</label>
              <input value={form.document_number} onChange={e => set('document_number', e.target.value)}
                className={inp} placeholder="Ej: 001-0001" />
            </div>
            <div>
              <label className={lbl}>Base Gravable ($) *</label>
              <input type="number" value={form.base_amount} min="0" step="1"
                onChange={e => set('base_amount', e.target.value)} className={inp} required />
            </div>
          </div>

          {/* Preview del cálculo */}
          {calcTax !== null && (
            <div className={`p-3 rounded-lg text-sm ${calcTax.tax > 0 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-gray-700 text-gray-500'}`}>
              <span className="font-medium">Valor calculado: {formatCOP(calcTax.tax)}</span>
              <span className="ml-2 text-xs">({calcTax.note})</span>
            </div>
          )}

          <div>
            <label className={lbl}>Referencia</label>
            <input value={form.reference} onChange={e => set('reference', e.target.value)}
              className={inp} placeholder="Ej: Factura 001-0001" />
          </div>
          <div>
            <label className={lbl}>Notas</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className={inp + ' h-auto py-2 resize-none'} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Withholding() {
  const [entries, setEntries] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage]           = useState(1);
  const [meta, setMeta]           = useState(null);

  const [filters, setFilters] = useState({
    direction: '', type: '', start_date: '', end_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 30, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
      const [entriesRes, conceptsRes] = await Promise.all([
        taxesApi.getWithholding(params),
        taxesApi.getConcepts({ active_only: true }),
      ]);
      setEntries(entriesRes.data.data ?? []);
      setMeta(entriesRes.data.meta ?? null);
      setConcepts(conceptsRes.data.data ?? []);
    } catch { showError('Error al cargar retenciones'); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(entry) {
    if (!window.confirm('¿Eliminar esta retención?')) return;
    try {
      await taxesApi.deleteWithholding(entry.id);
      showSuccess('Retención eliminada');
      load();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al eliminar'); }
  }

  function setFilter(k, v) { setFilters(p => ({ ...p, [k]: v })); setPage(1); }

  const totals = entries.reduce((acc, e) => ({
    base: acc.base + Number(e.base_amount),
    tax:  acc.tax  + Number(e.tax_amount),
  }), { base: 0, tax: 0 });

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Retenciones</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Retenciones practicadas y sufridas
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
            <Plus className="w-4 h-4" />Nueva Retención
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <select value={filters.direction} onChange={e => setFilter('direction', e.target.value)} className={inputCls}>
            {DIR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.type} onChange={e => setFilter('type', e.target.value)} className={inputCls}>
            <option value="">Todos los tipos</option>
            <option value="retefuente">ReteFuente</option>
            <option value="reteica">ReteICA</option>
            <option value="iva">IVA</option>
          </select>
          <input type="date" value={filters.start_date} onChange={e => setFilter('start_date', e.target.value)}
            className={inputCls} placeholder="Desde" />
          <input type="date" value={filters.end_date} onChange={e => setFilter('end_date', e.target.value)}
            className={inputCls} placeholder="Hasta" />
        </div>

        {/* Cards resumen */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Total Base Gravable', value: formatCOP(totals.base), color: 'text-gray-900 dark:text-white' },
            { label: 'Total Impuesto', value: formatCOP(totals.tax), color: 'text-red-600 dark:text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
              <p className={`text-xl font-semibold font-mono mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Sin registros</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Fecha', 'Concepto', 'Tercero', 'Documento', 'Dirección', 'Base', 'Tasa', 'Impuesto', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{e.document_date}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 dark:text-white">{e.concept?.code} – {e.concept?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[140px] truncate">
                      {e.third_party?.name ?? e.third_party?.company_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">{e.document_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${DIR_COLORS[e.direction]}`}>
                        {e.direction === 'practicada' ? 'Practicada' : 'Sufrida'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">{formatCOP(e.base_amount)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-500 dark:text-gray-400">{e.rate}%</td>
                    <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">{formatCOP(e.tax_amount)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Página {meta.current_page} de {meta.last_page} ({meta.total} registros)</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">
                Anterior
              </button>
              <button disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <EntryModal
          concepts={concepts}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </LayoutNew>
  );
}
