import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Truck, Package, DollarSign, Phone, Mail, MapPin } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import SupplierModal from '../components/suppliers/SupplierModal';
import { showSuccess, showError } from '../utils/toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      
      const response = await api.get('/suppliers', { params });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      showError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

    try {
      await api.delete(`/suppliers/${id}`);
      showSuccess('Proveedor eliminado correctamente');
      fetchSuppliers();
    } catch (error) {
      if (error.response?.status === 409) {
        showError('No se puede eliminar un proveedor con órdenes de compra');
      } else {
        showError('Error al eliminar el proveedor');
      }
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Proveedores</h1>
            <p className="page-subtitle">Gestiona tus proveedores y órdenes de compra</p>
          </div>
          <button onClick={handleCreate} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>

        {/* Búsqueda */}
        <div className="card">
          <input
            type="text"
            placeholder="Buscar por nombre, empresa o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : suppliers.length === 0 ? (
          /* Sin proveedores */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {search ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              {search 
                ? 'Intenta con otro término de búsqueda'
                : 'Comienza agregando tus proveedores para gestionar órdenes de compra'
              }
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Crear Proveedor
              </button>
            )}
          </div>
        ) : (
          /* Grid de proveedores */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className="card group hover:shadow-strong transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-purple-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {supplier.name}
                      </h3>
                      {supplier.company_name && (
                        <p className="text-sm text-gray-600">{supplier.company_name}</p>
                      )}
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    supplier.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                  }`} />
                </div>

                {/* Información de contacto */}
                <div className="space-y-2 mb-4">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {(supplier.city || supplier.country) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>
                        {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">Productos</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600">
                      {supplier.products?.length || 0}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-900">Órdenes</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-600">
                      {supplier.total_orders || 0}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {supplier.tax_id && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md">
                      {supplier.tax_id}
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                    supplier.is_active 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {supplier.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={handleModalClose}
        />
      )}
    </LayoutNew>
  );
}