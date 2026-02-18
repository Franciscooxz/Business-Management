import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderTree, Grid3x3, Package } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import CategoryModal from '../components/categories/CategoryModal';
import { showSuccess, showError } from '../utils/toast';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories?per_page=100');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      showError('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      await api.delete(`/categories/${id}`);
      showSuccess('Categoría eliminada correctamente');
      fetchCategories();
    } catch (error) {
      if (error.response?.status === 409) {
        showError('No se puede eliminar una categoría con productos asignados');
      } else {
        showError('Error al eliminar la categoría');
      }
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCategory(null);
    fetchCategories();
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Categorías</h1>
            <p className="page-subtitle">Organiza tus productos por categorías</p>
          </div>
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : categories.length === 0 ? (
          /* Sin categorías */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderTree className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay categorías</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Comienza creando tu primera categoría para organizar tus productos
            </p>
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Crear Categoría
            </button>
          </div>
        ) : (
          /* Grid de categorías */
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Grid3x3 className="w-4 h-4" />
              <span className="font-medium">{categories.length}</span>
              <span>categorías</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div 
                  key={category.id} 
                  className="card group hover:shadow-strong transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                        {category.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                        {category.description || 'Sin descripción'}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-3 ${
                      category.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                    }`} />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {category.products_count || 0}
                      </span>
                      <span className="text-gray-500">productos</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={handleModalClose}
        />
      )}
    </LayoutNew>
  );
}