import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Plus, Search, X, Edit2, Trash2, Wallet, Building2, AlertCircle,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { treasuryApi } from '../../api/modules/treasury';
import { showSuccess, showError } from '../../utils/toast';

const ACCOUNT_TYPES = {
  corriente:       'Corriente',
  ahorros:         'Ahorros',
  caja_menor:      'Caja Menor',
  fondo_fijo:      'Fondo Fijo',
  tarjeta_credito: 'Tarjeta Crédito',
};

const TYPE_COLORS = {
  corriente:       'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  ahorros:         'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  caja_menor:      'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  fondo_fijo:      'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  tarjeta_credito: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

function formatCOP(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(Number(v));
}

const EMPTY = {
  name: '', account_number: '', type: 'corriente', bank_name: '',
  currency: 'COP', initial_balance: '', initial_balance_date: '',
  is_active: true, notes: '',
};

function Modal({ title, onClose, onSubmit, loading, data, onChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Nombre *
              </label>
              <input
                value={data.name}
                onChange={e => onChange('name', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Tipo *
              </label>
              <select
                value={data.type}
                onChange={e => onChange('type', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Object.entries(ACCOUNT_TYPES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Número de Cuenta
              </label>
              <input
                value={data.account_number}
                onChange={e => onChange('account_number', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Banco
              </label>
              <input
                value={data.bank_name}
                onChange={e => onChange('bank_name', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Saldo Inicial *
              </label>
              <input
                type="number" step="0.01"
                value={data.initial_balance}
                onChange={e => onChange('initial_balance', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-mono text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Fecha Saldo Inicial *
              </label>
              <input
                type="date"
                value={data.initial_balance_date}
                onChange={e => onChange('initial_balance_date', e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">
                Notas
              </label>
              <textarea
                value={data.notes}
                onChange={e => onChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox" id="is_active"
                checked={data.is_active}
                onChange={e => onChange('is_active', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                Cuenta activa
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BankAccounts() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [formData, setFormData]   = useState(EMPTY);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await treasuryApi.getBankAccounts();
      const list = res.data?.data ?? res.data ?? [];
      setAccounts(Array.isArray(list) ? list : list.data ?? []);
    } catch {
      showError('Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = accounts.filter(a =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.bank_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.account_number?.includes(search)
  );

  const totalBalance = accounts.reduce((s, a) => s + Number(a.current_balance ?? 0), 0);
  const activeCount  = accounts.filter(a => a.is_active).length;

  function openCreate() { setEditing(null); setFormData(EMPTY); setShowModal(true); }
  function openEdit(a)  { setEditing(a); setFormData({ ...a }); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditing(null); }
  function handleChange(k, v) { setFormData(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await treasuryApi.updateBankAccount(editing.id, formData);
        showSuccess('Cuenta actualizada');
      } else {
        await treasuryApi.createBankAccount(formData);
        showSuccess('Cuenta creada');
      }
      closeModal();
      load();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a) {
    if (!confirm(`¿Eliminar la cuenta "${a.name}"?`)) return;
    try {
      await treasuryApi.deleteBankAccount(a.id);
      showSuccess('Cuenta eliminada');
      load();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al eliminar');
    }
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Cuentas Bancarias</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{activeCount} cuentas activas</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Saldo Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 font-mono">{formatCOP(totalBalance)}</p>
              </div>
              <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Cuentas Activas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{activeCount}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Cuentas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{accounts.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-8 pl-9 pr-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">{search ? 'Sin resultados' : 'No hay cuentas bancarias'}</p>
              {!search && (
                <button onClick={openCreate} className="text-sm text-primary-600 hover:underline">
                  Crear primera cuenta
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    {['Nombre', 'Tipo', 'Banco', 'Número', 'Saldo', 'Estado', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[a.type] ?? ''}`}>
                          {ACCOUNT_TYPES[a.type] ?? a.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{a.bank_name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{a.account_number ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-right">
                        <span className={Number(a.current_balance) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                          {formatCOP(a.current_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${a.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${a.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {a.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(a)}
                            title="Editar"
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            title="Eliminar"
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal
          title={editing ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          loading={saving}
          data={formData}
          onChange={handleChange}
        />
      )}
    </LayoutNew>
  );
}
