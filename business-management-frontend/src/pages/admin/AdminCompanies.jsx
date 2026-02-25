import { useEffect, useState } from 'react';
import {
  Building2, Plus, Search, X, RefreshCw, Power,
  Edit2, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { adminApi } from '../../api/modules/admin';
import { showSuccess, showError } from '../../utils/toast';

const PLANS = [
  { value: '', label: 'Todos los planes' },
  { value: 'basico',      label: 'Básico' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'empresarial', label: 'Empresarial' },
];

const PLAN_COLORS = {
  basico:      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  profesional: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  empresarial: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
};

const INITIAL_FORM = {
  nombre_comercial: '',
  razon_social: '',
  nit: '',
  nit_dv: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  department: '',
  plan: 'basico',
  tipo_persona: 'juridica',
};

// ── Modal de crear/editar empresa ────────────────────────────────────────────
function CompanyModal({ company, onClose, onSave }) {
  const [form, setForm] = useState(company ? {
    nombre_comercial: company.nombre_comercial ?? '',
    razon_social:     company.razon_social ?? '',
    nit:              company.nit ?? '',
    nit_dv:           company.nit_dv ?? '',
    email:            company.email ?? '',
    phone:            company.phone ?? '',
    address:          company.address ?? '',
    city:             company.city ?? '',
    department:       company.department ?? '',
    plan:             company.plan ?? 'basico',
    tipo_persona:     company.tipo_persona ?? 'juridica',
  } : INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      if (company) {
        await adminApi.updateCompany(company.id, form);
        showSuccess('Empresa actualizada.');
      } else {
        await adminApi.createCompany(form);
        showSuccess('Empresa creada exitosamente.');
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
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {company ? 'Editar Empresa' : 'Nueva Empresa'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre Comercial *
              </label>
              <input
                className="input w-full"
                value={form.nombre_comercial}
                onChange={(e) => set('nombre_comercial', e.target.value)}
                required
              />
              {errors.nombre_comercial && <p className="text-xs text-red-500 mt-1">{errors.nombre_comercial[0]}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Razón Social *
              </label>
              <input
                className="input w-full"
                value={form.razon_social}
                onChange={(e) => set('razon_social', e.target.value)}
                required
              />
              {errors.razon_social && <p className="text-xs text-red-500 mt-1">{errors.razon_social[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">NIT *</label>
              <input
                className="input w-full"
                value={form.nit}
                onChange={(e) => set('nit', e.target.value)}
                placeholder="900123456"
                required
              />
              {errors.nit && <p className="text-xs text-red-500 mt-1">{errors.nit[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">DV</label>
              <input
                className="input w-full"
                value={form.nit_dv}
                onChange={(e) => set('nit_dv', e.target.value)}
                placeholder="1"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email[0]}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
              <input
                className="input w-full"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Dirección</label>
              <input
                className="input w-full"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ciudad</label>
              <input
                className="input w-full"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Departamento</label>
              <input
                className="input w-full"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
              <select
                className="input w-full"
                value={form.plan}
                onChange={(e) => set('plan', e.target.value)}
              >
                <option value="basico">Básico</option>
                <option value="profesional">Profesional</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo Persona</label>
              <select
                className="input w-full"
                value={form.tipo_persona}
                onChange={(e) => set('tipo_persona', e.target.value)}
              >
                <option value="juridica">Jurídica</option>
                <option value="natural">Natural</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary" disabled={saving}>Cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : (company ? 'Guardar Cambios' : 'Crear Empresa')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AdminCompanies() {
  const [companies, setCompanies]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState(null);
  const [modal, setModal]           = useState(null); // null | 'create' | company object

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, statsRes] = await Promise.all([
        adminApi.getCompanies({
          search:    search || undefined,
          plan:      planFilter || undefined,
          is_active: activeFilter === '' ? undefined : activeFilter,
          page,
          per_page:  12,
        }),
        adminApi.getStats(),
      ]);
      setCompanies(companiesRes.data.data ?? []);
      setPagination(companiesRes.data.pagination ?? null);
      setStats(statsRes.data.data ?? null);
    } catch {
      showError('Error al cargar empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, planFilter, activeFilter, page]);

  const handleToggle = async (company) => {
    try {
      await adminApi.toggleActive(company.id);
      showSuccess(`Empresa ${company.is_active ? 'desactivada' : 'activada'}.`);
      fetchData();
    } catch {
      showError('Error al cambiar estado.');
    }
  };

  const handleSave = () => {
    setModal(null);
    fetchData();
  };

  return (
    <LayoutNew>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Empresas</h1>
            <p className="page-subtitle">Gestión global de empresas del SaaS</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} disabled={loading} className="btn btn-secondary">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button onClick={() => setModal('create')} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Nueva Empresa
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Empresas', value: stats.total, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Activas',        value: stats.active,   color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Inactivas',      value: stats.inactive, color: stats.inactive > 0 ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 bg-gray-50 dark:bg-gray-800' },
              { label: 'Total Usuarios', value: stats.total_users, color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabla */}
        <div className="card p-0 overflow-hidden">

          {/* Filtros */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por nombre, NIT o email..."
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
            <div className="flex gap-2 shrink-0">
              <select
                value={planFilter}
                onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
                className="input text-sm py-1.5"
              >
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                className="input text-sm py-1.5"
              >
                <option value="">Todos</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
          </div>

          {/* Contenido */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron empresas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    {['Empresa', 'NIT', 'Plan', 'Usuarios', 'Estado', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{company.nombre_comercial}</p>
                        <p className="text-xs text-gray-400">{company.razon_social}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {company.nit_formatted ?? company.nit}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[company.plan] ?? PLAN_COLORS.basico}`}>
                          {company.plan ?? 'básico'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Users className="w-3.5 h-3.5" />
                          {company.users_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {company.is_active ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Activa
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setModal(company)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggle(company)}
                            className={`p-1.5 rounded-md transition-colors ${
                              company.is_active
                                ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600'
                                : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-400 hover:text-emerald-600'
                            }`}
                            title={company.is_active ? 'Desactivar' : 'Activar'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
        <CompanyModal
          company={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </LayoutNew>
  );
}
