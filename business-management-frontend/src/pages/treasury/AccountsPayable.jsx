import { useEffect, useState, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, CreditCard, AlertCircle, X,
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
  parcial:   { label: 'Parcial',   dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
  pagado:    { label: 'Pagado',    dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  vencido:   { label: 'Vencido',   dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20' },
  anulado:   { label: 'Anulado',   dot: 'bg-gray-400',    text: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-100 dark:bg-gray-700' },
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

const AGING_COLORS = {
  vigente: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400',
  '1-30':  'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
  '31-60': 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400',
  '61-90': 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  '+90':   'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300',
};

const AGING_LABELS = {
  vigente: 'Vigente', '1-30': '1-30 días', '31-60': '31-60 días', '61-90': '61-90 días', '+90': '+90 días',
};

function PayModal({ ap, onClose, onSaved }) {
  const [form, setForm]     = useState({
    bank_account_id: '', amount: ap.pending_amount,
    movement_date: new Date().toISOString().split('T')[0],
    reference: '', description: '',
    retention_retefuente: '', retention_reteiva: '', retention_reteica: '',
  });
  const [banks, setBanks]   = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    treasuryApi.getBankAccounts({ per_page: 100 }).then(r => {
      const raw = r.data?.data ?? r.data ?? [];
      setBanks(Array.isArray(raw) ? raw : raw.data ?? []);
    }).catch(() => {});
  }, []);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      ['retention_retefuente', 'retention_reteiva', 'retention_reteica'].forEach(k => {
        if (!payload[k]) delete payload[k];
      });
      await treasuryApi.payPayable(ap.id, payload);
      showSuccess('Pago registrado correctamente');
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Registrar Pago a Proveedor</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ap.third_party?.business_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saldo Pendiente</span>
            <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">{formatCOP(ap.pending_amount)}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Monto *</label>
              <input
                type="number" step="0.01" min="0.01" max={ap.pending_amount}
                value={form.amount} onChange={e => set('amount', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Fecha *</label>
              <input
                type="date" value={form.movement_date} onChange={e => set('movement_date', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Cuenta Bancaria *</label>
              <select
                value={form.bank_account_id} onChange={e => set('bank_account_id', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Seleccionar cuenta...</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Referencia</label>
              <input
                value={form.reference} onChange={e => set('reference', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Retenciones</p>
          <div className="grid grid-cols-3 gap-3">
            {[['retention_retefuente','Retefuente'],['retention_reteiva','ReteIVA'],['retention_reteica','ReteICA']].map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">{l}</label>
                <input
                  type="number" step="0.01" min="0" value={form[k]} onChange={e => set(k, e.target.value)}
                  className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60">
              {saving ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AccountsPayable() {
  const [data, setData]           = useState({ data: [], meta: {} });
  const [aging, setAging]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState('');
  const [payTarget, setPayTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, agingRes] = await Promise.all([
        treasuryApi.getPayables({ page, per_page: 20, status: status || undefined, search: search || undefined }),
        treasuryApi.getPayableAging(),
      ]);
      setData(listRes.data);
      setAging(agingRes.data);
    } catch {
      showError('Error al cargar cuentas por pagar');
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const { data: rows = [], meta = {} } = data;
  const agingData    = aging?.data ?? {};
  const totalPending = aging?.total_pending ?? 0;

  return (
    <LayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cuentas por Pagar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Total pendiente:{' '}
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatCOP(totalPending)}</span>
            </p>
          </div>
        </div>

        {/* Aging buckets */}
        {Object.keys(agingData).length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(agingData).map(([bucket, info]) => (
              <div key={bucket} className={`rounded-xl border p-4 ${AGING_COLORS[bucket] ?? ''}`}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1">{AGING_LABELS[bucket] ?? bucket}</p>
                <p className="text-lg font-bold font-mono leading-tight">{formatCOP(info.amount)}</p>
                <p className="text-xs mt-0.5 opacity-80">{info.count} facturas</p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar proveedor..."
                className="h-8 pl-9 pr-3 w-52 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-1">
              {['', 'pendiente', 'parcial', 'vencido', 'pagado'].map(s => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    status === s
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {s || 'Todos'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Sin cuentas por pagar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Proveedor', 'Factura', 'Vencimiento', 'Días', 'Total', 'Pagado', 'Pendiente', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(ap => (
                    <tr key={ap.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[160px] truncate">
                        {ap.third_party?.business_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                        {ap.supplier_invoice ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {ap.due_date}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {ap.days_overdue > 0
                          ? <span className="text-red-600 dark:text-red-400">+{ap.days_overdue}d</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-gray-700 dark:text-gray-300">
                        {formatCOP(ap.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-emerald-700 dark:text-emerald-400">
                        {formatCOP(ap.paid_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-right font-semibold text-gray-900 dark:text-white">
                        {formatCOP(ap.pending_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip status={ap.status} />
                      </td>
                      <td className="px-4 py-3">
                        {['pendiente', 'parcial', 'vencido'].includes(ap.status) && (
                          <button
                            onClick={() => setPayTarget(ap)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {payTarget && (
        <PayModal
          ap={payTarget}
          onClose={() => setPayTarget(null)}
          onSaved={() => { setPayTarget(null); load(); }}
        />
      )}
    </LayoutNew>
  );
}
