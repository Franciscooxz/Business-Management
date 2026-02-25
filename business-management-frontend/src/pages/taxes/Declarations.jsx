import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LayoutNew from '../../components/layout/LayoutNew';
import { taxesApi } from '../../api/modules/taxes';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (!v && v !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(v));
}

const STATUS_COLORS = {
  borrador:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  presentada: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  pagada:     'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
};
const STATUS_LABELS = { borrador: 'Borrador', presentada: 'Presentada', pagada: 'Pagada' };

const TYPE_COLORS = {
  iva:        'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  retefuente: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  reteica:    'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  ica:        'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  renta:      'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
};

const PERIOD_TYPES = {
  iva:        { periodType: 'bimestral', maxPeriod: 6, label: 'Bimestre' },
  retefuente: { periodType: 'mensual',   maxPeriod: 12, label: 'Mes' },
  reteica:    { periodType: 'bimestral', maxPeriod: 6, label: 'Bimestre' },
  ica:        { periodType: 'anual',     maxPeriod: 1, label: 'Año' },
  renta:      { periodType: 'anual',     maxPeriod: 1, label: 'Año' },
};

function NewDeclarationModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    type: 'retefuente', period_type: 'mensual', year: new Date().getFullYear(),
    period_number: new Date().getMonth() + 1, previous_balance_favor: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  // Actualizar period_type cuando cambia el tipo de impuesto
  function handleTypeChange(type) {
    const cfg = PERIOD_TYPES[type] ?? { periodType: 'mensual', maxPeriod: 12 };
    setForm(p => ({
      ...p,
      type,
      period_type:   cfg.periodType,
      period_number: 1,
    }));
  }

  const cfg = PERIOD_TYPES[form.type] ?? { maxPeriod: 12 };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await taxesApi.createDeclaration(form);
      showSuccess('Declaración creada');
      onSaved();
    } catch (err) { showError(err.response?.data?.message ?? 'Error al crear'); }
    finally { setSaving(false); }
  }

  const inp = 'w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
  const lbl = 'block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nueva Declaración</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Tipo de impuesto *</label>
            <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className={inp} required>
              <option value="retefuente">Retención en la Fuente</option>
              <option value="iva">IVA</option>
              <option value="reteica">Retención ICA</option>
              <option value="ica">ICA</option>
              <option value="renta">Renta</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Año *</label>
              <input type="number" value={form.year} min={2020} max={2099}
                onChange={e => set('year', parseInt(e.target.value))} className={inp} required />
            </div>
            <div>
              <label className={lbl}>{PERIOD_TYPES[form.type]?.label ?? 'Período'} *</label>
              <select value={form.period_number} onChange={e => set('period_number', parseInt(e.target.value))} className={inp}>
                {Array.from({ length: cfg.maxPeriod }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>Saldo a favor período anterior ($)</label>
            <input type="number" value={form.previous_balance_favor} min={0} step={1}
              onChange={e => set('previous_balance_favor', e.target.value)} className={inp} />
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
              {saving ? 'Creando...' : 'Crear Declaración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Declarations() {
  const navigate = useNavigate();
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]        = useState(false);
  const [typeFilter, setTypeFilter]      = useState('');
  const [yearFilter, setYearFilter]      = useState(String(new Date().getFullYear()));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxesApi.getDeclarations({
        type: typeFilter || undefined,
        year: yearFilter || undefined,
      });
      setDeclarations(res.data.data ?? []);
    } catch { showError('Error al cargar declaraciones'); }
    finally { setLoading(false); }
  }, [typeFilter, yearFilter]);

  useEffect(() => { load(); }, [load]);

  const inputCls = 'h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Declaraciones Tributarias</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">IVA, ReteFuente, ReteICA, ICA</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700">
            <Plus className="w-4 h-4" />Nueva Declaración
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inputCls}>
            <option value="">Todos los impuestos</option>
            <option value="retefuente">Retención en la Fuente</option>
            <option value="iva">IVA</option>
            <option value="reteica">Retención ICA</option>
            <option value="ica">ICA</option>
            <option value="renta">Renta</option>
          </select>
          <input type="number" value={yearFilter} min={2020} max={2099}
            onChange={e => setYearFilter(e.target.value)}
            className={inputCls + ' w-24'} placeholder="Año" />
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : declarations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <p className="text-sm text-gray-400">Sin declaraciones registradas</p>
              <button onClick={() => setShowModal(true)} className="text-sm text-primary-600 hover:underline">
                Crear primera declaración
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  {['Tipo', 'Período', 'Fechas', 'Generado/ReteFuente', 'Descontable', 'Saldo Pagar', 'Saldo Favor', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {declarations.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group cursor-pointer"
                    onClick={() => navigate(`/taxes/declarations/${d.id}`)}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[d.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.type_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{d.period_label}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {d.start_date} – {d.end_date}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">
                      {formatCOP(d.total_tax_generated)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-gray-500 dark:text-gray-400">
                      {formatCOP(d.total_tax_discountable)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-red-600 dark:text-red-400">
                      {formatCOP(d.saldo_pagar)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-right text-emerald-600 dark:text-emerald-400">
                      {formatCOP(d.saldo_favor)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        {STATUS_LABELS[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        onClick={e => { e.stopPropagation(); navigate(`/taxes/declarations/${d.id}`); }}>
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <NewDeclarationModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </LayoutNew>
  );
}
