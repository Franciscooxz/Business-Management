import { useEffect, useState } from 'react';
import { Eye, Calendar, ShoppingBag, Download, XCircle, Search, Filter, FileSpreadsheet } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import ViewSaleModal from '../components/sales/ViewSaleModal';
import { showSuccess, showError } from '../utils/toast';
import { generateSaleInvoice, downloadPDF } from '../utils/pdfGenerator';
import { exportToExcel, formatSalesForExcel } from '../utils/excelExport';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchSales();
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo, page]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        per_page: 10,
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_method', paymentFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await api.get(`/sales?${params}`);
      setSales(response.data.data);
      setPagination(response.data.meta);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      showError('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      setSelectedSale(response.data.data);
      setDetailModalOpen(true);
    } catch (error) {
      showError('Error al cargar detalles de la venta');
    }
  };

  const handleCancelSale = async (saleId) => {
    if (!confirm('¿Estás seguro de cancelar esta venta? El stock será devuelto.')) return;

    try {
      await api.post(`/sales/${saleId}/cancel`);
      showSuccess('Venta cancelada correctamente');
      fetchSales();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al cancelar la venta');
    }
  };

  const handleDownloadInvoice = async (saleId) => {
    try {
      const response = await api.get(`/sales/${saleId}`);
      const sale = response.data.data;
      
      const doc = generateSaleInvoice(sale);
      downloadPDF(doc, `Factura-${sale.id.toString().padStart(6, '0')}.pdf`);
      
      showSuccess('Factura descargada correctamente');
    } catch (error) {
      console.error('Error al generar factura:', error);
      showError('Error al generar la factura');
    }
  };

  const handleExportExcel = () => {
    try {
      const formatted = formatSalesForExcel(sales);
      const success = exportToExcel(
        formatted,
        `Ventas-${new Date().toISOString().split('T')[0]}`,
        'Ventas'
      );
      if (success) {
        showSuccess('Ventas exportadas a Excel correctamente');
      } else {
        showError('Error al exportar a Excel');
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showError('Error al exportar a Excel');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completada: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      pendiente: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };

    const icons = {
      completada: '✓',
      pendiente: '⏳',
      cancelada: '✕',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md ${styles[status]}`}>
        <span>{icons[status]}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentBadge = (method) => {
    const styles = {
      efectivo: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      tarjeta: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      transferencia: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    };

    const labels = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${styles[method]}`}>
        {labels[method]}
      </span>
    );
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Historial de Ventas</h1>
            <p className="page-subtitle">Consulta y gestiona todas las ventas realizadas</p>
          </div>
          
          <button
            onClick={handleExportExcel}
            className="btn bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
            disabled={sales.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos los estados</option>
              <option value="completada">Completadas</option>
              <option value="pendiente">Pendientes</option>
              <option value="cancelada">Canceladas</option>
            </select>

            {/* Método de pago */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">Todos los pagos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>

            {/* Rango de fechas */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="input pl-10"
                  placeholder="Desde"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="input pl-10"
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sales.length === 0 ? (
          /* Sin resultados */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay ventas</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {search || statusFilter || paymentFilter || dateFrom || dateTo
                ? 'No se encontraron ventas con los filtros aplicados'
                : 'Aún no se han registrado ventas'}
            </p>
          </div>
        ) : (
          /* Tabla de ventas */
          <>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Pago
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                            #{sale.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {sale.customer_name}
                            </p>
                            {sale.customer_email && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">{sale.customer_email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{sale.user?.name || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              ${parseFloat(sale.total).toFixed(2)}
                            </span>
                            {parseFloat(sale.discount) > 0 && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                -${parseFloat(sale.discount).toFixed(2)} desc.
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getPaymentBadge(sale.payment_method)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(sale.status)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(sale.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleViewDetail(sale.id)}
                              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                              title="Ver Detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadInvoice(sale.id)}
                              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-colors"
                              title="Descargar Factura"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {sale.status === 'completada' && (
                              <button
                                onClick={() => handleCancelSale(sale.id)}
                                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                title="Cancelar Venta"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium">{pagination.from}</span> a{' '}
                  <span className="font-medium">{pagination.to}</span> de{' '}
                  <span className="font-medium">{pagination.total}</span> ventas
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

      {detailModalOpen && selectedSale && (
        <ViewSaleModal
          sale={selectedSale}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSale(null);
          }}
        />
      )}
    </LayoutNew>
  );
}