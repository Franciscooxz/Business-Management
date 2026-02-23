import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Edit, Trash2, Users2, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import LayoutNew from '../../components/layout/LayoutNew';
import { thirdPartiesApi } from '../../api/modules/thirdParties';
import { showSuccess, showError } from '../../utils/toast';
import ThirdPartyModal from './ThirdPartyModal';

const DOCUMENT_TYPE_LABELS = {
  NIT: 'NIT',
  CC: 'C.C.',
  CE: 'C.E.',
  PAS: 'Pasaporte',
  TE: 'T.E.',
};

const TYPE_LABELS = {
  cliente: 'Cliente',
  proveedor: 'Proveedor',
  empleado: 'Empleado',
  otro: 'Otro',
};

const TYPE_COLORS = {
  cliente: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  proveedor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  empleado: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  otro: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const REGIMEN_LABELS = {
  comun: 'Responsable IVA',
  simplificado: 'No Responsable',
  no_aplica: '—',
};

function StatusChip({ type }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] ?? TYPE_COLORS.otro}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

export default function ThirdParties() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const res = await thirdPartiesApi.getAll(params);
      setItems(res.data.data);
      setMeta(res.data.meta);
    } catch {
      showError('Error al cargar terceros');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este tercero?')) return;
    try {
      await thirdPartiesApi.remove(id);
      showSuccess('Tercero eliminado');
      fetchAll();
    } catch (e) {
      showError(e.response?.data?.message ?? 'Error al eliminar');
    }
  };

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit = (item) => { setSelected(item); setModalOpen(true); };

  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };
  const handleTypeChange = (e) => { setTypeFilter(e.target.value); setPage(1); };

  return (
    <LayoutNew>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Terceros</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Clientes, proveedores y otros contactos</p>
          </div>
          <button onClick={openCreate} className="btn btn-primary self-start sm:self-auto">
            <Plus className="w-4 h-4" />
            Nuevo Tercero
          </button>
        </div>

        {/* Filtros */}
        <div className="card p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, NIT, email..."
              value={search}
              onChange={handleSearchChange}
              className="input pl-9 h-9 text-sm w-full"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={handleTypeChange}
            className="input h-9 text-sm sm:w-44"
          >
            <option value="">Todos los tipos</option>
            <option value="cliente">Cliente</option>
            <option value="proveedor">Proveedor</option>
            <option value="empleado">Empleado</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Users2 className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {search || typeFilter ? 'Sin resultados' : 'Sin terceros registrados'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {search || typeFilter ? 'Ajusta los filtros de búsqueda' : 'Crea el primer tercero con el botón de arriba'}
            </p>
          </div>
        ) : (
          <>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Nombre / Razón Social
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                      Documento
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                      Régimen
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors group">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white leading-tight">
                            {item.business_name ?? item.first_name + ' ' + item.last_name}
                          </p>
                          {item.email && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                          {DOCUMENT_TYPE_LABELS[item.document_type] ?? item.document_type}{' '}
                          {item.document_number}
                          {item.dv ? `-${item.dv}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {REGIMEN_LABELS[item.tax_regime] ?? item.tax_regime}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip type={item.type} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            title="Eliminar"
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

            {/* Paginación */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  {meta.from}–{meta.to} de {meta.total} registros
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    {page} / {meta.last_page}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === meta.last_page}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <ThirdPartyModal
          thirdParty={selected}
          onClose={() => { setModalOpen(false); setSelected(null); fetchAll(); }}
        />
      )}
    </LayoutNew>
  );
}
