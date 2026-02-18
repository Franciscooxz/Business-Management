import { useEffect, useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Edit, Trash2, FileSpreadsheet } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import CustomerModal from '../components/customers/CustomerModal';
import { showSuccess, showError } from '../utils/toast';
import { exportToExcel, formatCustomersForExcel } from '../utils/excelExport';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [search, page]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        per_page: 10,
      });

      if (search) params.append('search', search);

      const response = await api.get(`/customers?${params}`);
      setCustomers(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      showError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      await api.delete(`/customers/${id}`);
      showSuccess('Cliente eliminado correctamente');
      fetchCustomers();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al eliminar cliente');
    }
  };

  const handleExportExcel = () => {
    try {
      const formatted = formatCustomersForExcel(customers);
      const success = exportToExcel(
        formatted,
        `Clientes-${new Date().toISOString().split('T')[0]}`,
        'Clientes'
      );
      if (success) {
        showSuccess('Clientes exportados a Excel');
      } else {
        showError('Error al exportar a Excel');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showError('Error al exportar a Excel');
    }
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Clientes</h1>
            <p className="page-subtitle">Administra tu base de clientes</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="btn bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
              disabled={customers.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
            
            <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : customers.length === 0 ? (
          /* Sin resultados */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay clientes
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {search
                ? 'No se encontraron clientes con ese criterio de búsqueda'
                : 'Comienza agregando tu primer cliente'}
            </p>
            {!search && (
              <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Crear Cliente
              </button>
            )}
          </div>
        ) : (
          /* Lista de clientes */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers.map((customer) => (
                <div key={customer.id} className="card hover:shadow-strong transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 dark:text-blue-300 font-bold text-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Cliente #{customer.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="flex-1 btn btn-secondary text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="flex-1 btn text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium">{pagination.from}</span> a{' '}
                  <span className="font-medium">{pagination.to}</span> de{' '}
                  <span className="font-medium">{pagination.total}</span> clientes
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modales */}
      {createModalOpen && (
        <CustomerModal
          onClose={() => {
            setCreateModalOpen(false);
            fetchCustomers();
          }}
        />
      )}

      {editModalOpen && selectedCustomer && (
        <CustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedCustomer(null);
            fetchCustomers();
          }}
        />
      )}
    </LayoutNew>
  );
}