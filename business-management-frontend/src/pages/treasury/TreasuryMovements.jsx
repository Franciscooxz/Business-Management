import { useEffect, useState, useCallback } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, Search, X,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { treasuryApi } from '../../api/modules/treasury';
import { showSuccess, showError } from '../../utils/toast';

function formatCOP(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(v));
}

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  aplicado:  { label: 'Aplicado',  dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  anulado:   { label: 'Anulado',   dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
};

const TYPE_ICONS = {
  ingreso:  { Icon: ArrowDownCircle, color: 'text-emerald-600 dark:text-emerald-400' },
  egreso:   { Icon: ArrowUpCircle,   color: 'text-red-500 dark:text-red-400' },
  traslado: { Icon: ArrowLeftRight,  color: 'text-blue-500 dark:text-blue-400' },
};

const CONCEPTS = {
  cobro_cartera:  'Cobro Cartera',
  pago_proveedor: 'Pago Proveedor',
  transferencia:  'Transferencia',
  nota_debito:    'Nota Débito',
  nota_credito:   'Nota Crédito',
  consignacion:   'Consignación',
  retiro:         'Retiro',
  gasto_bancario: 'Gasto Bancario',
  prestamo:       'Préstamo',
  abono_prestamo: 'Abono Préstamo',
  otro:           'Otro',
};

const CONCEPTS_BY_TYPE = {
  ingreso:  ['cobro_cartera', 'consignacion', 'nota_credito', 'otro'],
  egreso:   ['pago_proveedor', 'nota_debito', 'retiro', 'gasto_bancario', 'prestamo', 'abono_prestamo', 'otro'],
  traslado: ['transferencia'],
};

function StatusChip({ status }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

const EMPTY_FORM = {
  type: 'ingreso', concept: 'cobro_cartera', bank_account_id: '',
  destination_account_id: '', amount: '',
  movement_date: new Date().toISOString().split('T')[0],
  reference: '', description: '',
  retention_retefuente: '', retention_reteiva: '', retention_reteica: '',
};

function NewMovementModal({ onClose, onSaved }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [bankAccounts, setBanks] = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    treasuryApi.getBankAccounts({ per_page: 100 }).then(r => {
      const raw = r.data?.data ?? r.data ?? [];
      setBanks(Array.isArray(raw) ? raw : raw.data ?? []);
    }).catch(() => {});
  }, []);

  function set(k, v) {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Reset concepto al cambiar tipo
      if (k === 'type') {
        next.concept = CONCEPTS_BY_TYPE[v][0];
      }
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.type !== 'traslado') delete payload.destination_account_id;
      ['retention_retefuente', 'retention_reteiva', 'retention_reteica'].forEach(k => {
        if (!payload[k]) delete payload[k];
      });
      await treasuryApi.createMovement(payload);
      showSuccess('Movimiento registrado');
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al registrar movimiento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Nuevo Movimiento</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Tipo selector */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {['ingreso', 'egreso', 'traslado'].map(t => (
              <button
                key={t} type="button" onClick={() => set('type', t)}
                className={`py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  form.type === t
                    ? 'bg-white dark:bg-gray-800 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Concepto *</label>
              <select
                value={form.concept} onChange={e => set('concept', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CONCEPTS_BY_TYPE[form.type].map(v => (
                  <option key={v} value={v}>{CONCEPTS[v]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Fecha *</label>
              <input
                type="date" value={form.movement_date} onChange={e => set('movement_date', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                {form.type === 'traslado' ? 'Cuenta Origen *' : 'Cuenta Bancaria *'}
              </label>
              <select
                value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Seleccionar...</option>
                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {form.type === 'traslado' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Cuenta Destino *</label>
                <select
                  value={form.destination_account_id} onChange={e => set('destination_account_id', e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {bankAccounts.filter(b => b.id !== Number(form.bank_account_id)).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Monto *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={form.amount} onChange={e => set('amount', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Referencia</label>
              <input
                value={form.reference} onChange={e => set('reference', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Descripción</label>
              <textarea
                value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>

          {form.type !== 'traslado' && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Retenciones</p>
              <div className="grid grid-cols-3 gap-3">
                {[['retention_retefuente','Retefuente'],['retention_reteiva','ReteIVA'],['retention_reteica','ReteICA']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{l}</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form[k]} onChange={e => set(k, e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
            >
              {saving ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TreasuryMovements() {
  const [data, setData]       = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('');
  const [showModal, setModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await treasuryApi.getMovements({
        page,
        per_page: 20,
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setData(res.data);
    } catch {
      showError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const { data: rows = [], meta = {} } = data;

  async function handleReverse(m) {
    if (!confirm(`¿Anular el movimiento "${m.reference ?? '#' + m.id}"?`)) return;
    try {
      await treasuryApi.reverseMovement(m.id);
      showSuccess('Movimiento anulado');
      load();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al anular');
    }
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Movimientos de Tesorería</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Ingresos, egresos y traslados</p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Movimiento
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar referencia..."
                className="h-8 pl-9 pr-3 w-52 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-1">
              {['', 'ingreso', 'egreso', 'traslado'].map(t => (
                <button
                  key={t}
                  onClick={() => { setType(t); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    typeFilter === t
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t || 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin movimientos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Fecha', 'Tipo', 'Concepto', 'Cuenta', 'Referencia', 'Monto', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(m => {
                    const { Icon, color } = TYPE_ICONS[m.type] ?? TYPE_ICONS.ingreso;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {m.movement_date}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{m.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {CONCEPTS[m.concept] ?? m.concept}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {m.bank_account?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400">
                          {m.reference ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-right">
                          <span className={
                            m.type === 'egreso'   ? 'text-red-600 dark:text-red-400' :
                            m.type === 'ingreso'  ? 'text-emerald-700 dark:text-emerald-400' :
                            'text-blue-600 dark:text-blue-400'
                          }>
                            {m.type === 'egreso' ? '-' : '+'}{formatCOP(m.net_amount ?? m.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={m.status} />
                        </td>
                        <td className="px-4 py-3">
                          {m.status === 'aplicado' && (
                            <button
                              onClick={() => handleReverse(m)}
                              title="Anular movimiento"
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-opacity"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta.last_page > 1 && (
            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Página {meta.current_page} de {meta.last_page} — {meta.total} registros
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                  disabled={page >= meta.last_page}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewMovementModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </LayoutNew>
  );
}
