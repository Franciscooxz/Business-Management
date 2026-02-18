import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Edit, Trash2, FileSpreadsheet, Upload } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import ProductModal from '../components/products/ProductModal';
import { showSuccess, showError } from '../utils/toast';
import { exportToExcel, formatProductsForExcel, generateInventoryReport, exportMultipleSheets } from '../utils/excelExport';
import ImportProductsModal from '../components/products/ImportProductsModal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);  

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, categoryFilter, stockFilter, page]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        per_page: 12,
      });

      if (search) params.append('search', search);
      if (categoryFilter) params.append('category_id', categoryFilter);
      if (stockFilter) params.append('stock_status', stockFilter);

      const response = await api.get(`/products?${params}`);
      setProducts(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories', { params: { per_page: 100 } });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await api.delete(`/products/${id}`);
      showSuccess('Producto eliminado correctamente');
      fetchProducts();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const handleExportSimple = () => {
    try {
      const formatted = formatProductsForExcel(products);
      const success = exportToExcel(
        formatted,
        `Productos-${new Date().toISOString().split('T')[0]}`,
        'Productos'
      );
      if (success) {
        showSuccess('Productos exportados a Excel');
      } else {
        showError('Error al exportar a Excel');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showError('Error al exportar a Excel');
    }
  };

  const handleExportComplete = () => {
    try {
      const report = generateInventoryReport(products);
      const success = exportMultipleSheets(report.sheets, report.fileName);
      if (success) {
        showSuccess('Reporte completo generado con éxito');
      } else {
        showError('Error al generar reporte');
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      showError('Error al generar reporte completo');
    }
  };

  const getStockBadge = (product) => {
    const minStock = product.min_stock || 5;
    
    if (product.stock === 0) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Sin stock</span>;
    } else if (product.stock <= minStock) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Stock bajo</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Disponible</span>;
    }
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Productos</h1>
            <p className="page-subtitle">Gestiona tu catálogo de productos</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setImportModalOpen(true)}
              className="btn bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800"
            >
              <Upload className="w-4 h-4" />
              Importar Excel
            </button>

            <button
              onClick={handleExportComplete}
              className="btn bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
              disabled={products.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Reporte Completo
            </button>

            <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input pl-10"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos los estados</option>
              <option value="in_stock">En stock</option>
              <option value="low_stock">Stock bajo</option>
              <option value="out_of_stock">Sin stock</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          /* Sin resultados */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No hay productos
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {search || categoryFilter || stockFilter
                ? 'No se encontraron productos con los filtros aplicados'
                : 'Comienza agregando tu primer producto'}
            </p>
            {!search && !categoryFilter && !stockFilter && (
              <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Crear Producto
              </button>
            )}
          </div>
        ) : (
          /* Grid de productos */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="card hover:shadow-strong transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {product.category?.name || 'Sin categoría'}
                      </p>
                    </div>
                    {getStockBadge(product)}
                  </div>

                  {product.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Precio:</span>
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {product.currency?.symbol || '$'}{parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Stock:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {product.stock} unidades
                      </span>
                    </div>
                    {product.sku && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">SKU:</span>
                        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                          {product.sku}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(product)}
                      className="flex-1 btn btn-secondary text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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
                  <span className="font-medium">{pagination.total}</span> productos
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
        <ProductModal
          categories={categories}
          onClose={() => {
            setCreateModalOpen(false);
            fetchProducts();
          }}
        />
      )}

      {editModalOpen && selectedProduct && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedProduct(null);
            fetchProducts();
          }}
        />
      )}

      {importModalOpen && (
        <ImportProductsModal
          categories={categories}
          onClose={() => setImportModalOpen(false)}
          onSuccess={fetchProducts}
        />
      )}

    </LayoutNew>
  );
}