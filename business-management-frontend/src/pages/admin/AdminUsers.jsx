import { useEffect, useState } from 'react';
import {
  UserCog, Plus, Search, X, RefreshCw, Power,
  Edit2, ChevronLeft, ChevronRight, Building2,
  CheckCircle, XCircle, Shield,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { adminApi } from '../../api/modules/admin';
import { showSuccess, showError } from '../../utils/toast';

const ROLES = [
  { value: '',               label: 'Todos los roles' },
  { value: 'admin',          label: 'Administrador' },
  { value: 'accountant',     label: 'Contador' },
  { value: 'sales',          label: 'Ventas' },
  { value: 'warehouse',      label: 'Bodega' },
  { value: 'payroll_officer',label: 'Nómina' },
  { value: 'viewer',         label: 'Observador' },
  { value: 'user',           label: 'Usuario' },
  { value: 'super_admin',    label: 'Super Admin' },
];

const ROLE_COLORS = {
  super_admin:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  admin:          'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  accountant:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  sales:          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  warehouse:      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  payroll_officer:'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
  viewer:         'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  user:           'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
};

const ROLE_LABELS = {
  super_admin:    'Super Admin',
  admin:          'Admin',
  accountant:     'Contador',
  sales:          'Ventas',
  warehouse:      'Bodega',
  payroll_officer:'Nómina',
  viewer:         'Observador',
  user:           'Usuario',
};

// ── Modal usuario ─────────────────────────────────────────────────────────────
function UserModal({ user, companies, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:       user?.name ?? '',
    email:      user?.email ?? '',
    password:   '',
    role:       user?.role ?? 'user',
    company_id: user?.company_id ?? '',
    is_active:  user?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (!payload.company_id) payload.company_id = null;

    try {
      if (isEdit) {
        await adminApi.updateUser(user.id, payload);
        showSuccess('Usuario actualizado.');
      } else {
        await adminApi.createUser(payload);
        showSuccess('Usuario creado exitosamente.');
      }
      onSave();
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        showError(err.response?.data?.message ?? 'Error al guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
            <input className="input w-full" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input type="email" className="input w-full" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isEdit ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <input
              type="password"
              className="input w-full"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required={!isEdit}
              minLength={8}
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Rol *</label>
            <select className="input w-full" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.filter((r) => r.value).map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa</label>
            <select
              className="input w-full"
              value={form.company_id ?? ''}
              onChange={(e) => set('company_id', e.target.value || null)}
            >
              <option value="">— Sin empresa (super admin) —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre_comercial}</option>
              ))}
            </select>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Activo</label>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Usuario')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [users, setUsers]           = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modal, setModal]           = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        search:   search || undefined,
        role:     roleFilter || undefined,
        page,
        per_page: 15,
      });
      setUsers(res.data.data ?? []);
      setPagination(res.data.pagination ?? null);
    } catch {
      showError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await adminApi.getCompanies({ per_page: 500 });
      setCompanies(res.data.data ?? []);
    } catch {
      // silencioso
    }
  };

  useEffect(() => { fetchCompanies(); }, []);
  useEffect(() => { fetchUsers(); }, [search, roleFilter, page]);

  const handleDelete = async (user) => {
    if (!confirm(`¿Eliminar a ${user.name}?`)) return;
    try {
      await adminApi.deleteUser(user.id);
      showSuccess('Usuario eliminado.');
      fetchUsers();
    } catch (err) {
      showError(err.response?.data?.message ?? 'Error al eliminar.');
    }
  };

  const handleSave = () => {
    setModal(null);
    fetchUsers();
  };

  return (
    <LayoutNew>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Usuarios Globales</h1>
            <p className="page-subtitle">Gestión de todos los usuarios del sistema</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchUsers} disabled={loading} className="btn btn-secondary">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button onClick={() => setModal('create')} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="card p-0 overflow-hidden">

          {/* Filtros */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input text-sm py-1.5 shrink-0"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* Contenido */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <UserCog className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    {['Usuario', 'Empresa', 'Rol', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {users.map((user) => {
                    const company = companies.find((c) => c.id === user.company_id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-primary-700 dark:text-primary-300 font-semibold text-xs">
                                {user.name?.charAt(0)?.toUpperCase() ?? 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {company ? (
                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300 text-xs">
                              <Building2 className="w-3.5 h-3.5" />
                              {company.nombre_comercial}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 text-xs font-medium">
                              <Shield className="w-3.5 h-3.5" />
                              Adminova
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? ROLE_COLORS.user}`}>
                            {ROLE_LABELS[user.role] ?? user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_active ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Activo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium">
                              <XCircle className="w-3.5 h-3.5" /> Inactivo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setModal(user)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {user.role !== 'super_admin' && (
                              <button
                                onClick={() => handleDelete(user)}
                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-red-400 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!loading && pagination && pagination.last_page > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                Mostrando {((pagination.current_page - 1) * pagination.per_page) + 1} – {Math.min(pagination.current_page * pagination.per_page, pagination.total)} de {pagination.total}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.current_page === 1}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 font-medium">{pagination.current_page} / {pagination.last_page}</span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.last_page, p + 1))}
                  disabled={pagination.current_page === pagination.last_page}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <UserModal
          user={modal === 'create' ? null : modal}
          companies={companies}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </LayoutNew>
  );
}
