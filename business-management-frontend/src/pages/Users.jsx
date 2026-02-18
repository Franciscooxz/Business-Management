import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Users as UsersIcon, Shield, User, Filter } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import UserModal from '../components/users/UserModal';
import { showSuccess, showError } from '../utils/toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [search, roleFilter, statusFilter, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        per_page: 10,
      });

      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('is_active', statusFilter);

      const response = await api.get(`/users?${params}`);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      showError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setRoles([
        { id: 1, name: 'admin' },
        { id: 2, name: 'user' }
      ]);
    } catch (error) {
      console.error('Error al cargar roles:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await api.delete(`/users/${id}`);
      showSuccess('Usuario eliminado correctamente');
      fetchUsers();
    } catch (error) {
      if (error.response?.status === 403) {
        showError('No puedes eliminar tu propia cuenta');
      } else {
        showError('Error al eliminar el usuario');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700">
        <User className="w-3 h-3" />
        Usuario
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Activo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Inactivo
      </span>
    );
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Usuarios</h1>
            <p className="page-subtitle">Administra los usuarios del sistema</p>
          </div>
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input pl-10"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="user">Usuarios</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : users.length === 0 ? (
          /* Sin resultados */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              {search || roleFilter || statusFilter
                ? 'No se encontraron usuarios con los filtros aplicados'
                : 'Comienza agregando tu primer usuario'}
            </p>
          </div>
        ) : (
          /* Tabla de usuarios */
          <>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-700 font-semibold text-sm">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 text-base">{user.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-base text-gray-600">{user.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(user.is_active)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando <span className="font-medium">{pagination.from}</span> a{' '}
                  <span className="font-medium">{pagination.to}</span> de{' '}
                  <span className="font-medium">{pagination.total}</span> usuarios
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.last_page}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <UserModal
          user={editingUser}
          roles={roles}
          onClose={handleModalClose}
        />
      )}
    </LayoutNew>
  );
}