import { useEffect, useState } from 'react';
import { Plus, Package, Calendar, DollarSign, Truck, CheckCircle, Clock, XCircle, Eye, Download } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import PurchaseOrderModal from '../components/purchase-orders/PurchaseOrderModal';
import ReceiveOrderModal from '../components/purchase-orders/ReceiveOrderModal';
import ViewOrderModal from '../components/purchase-orders/ViewOrderModal';
import { showSuccess, showError } from '../utils/toast';
import { generatePurchaseOrderPDF, downloadPDF } from '../utils/pdfGenerator';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await api.get('/purchase-orders', { params });
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      showError('Error al cargar órdenes de compra');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers', { params: { per_page: 100 } });
      setSuppliers(response.data.data.filter(s => s.is_active));
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('¿Estás seguro de cancelar esta orden de compra?')) return;

    try {
      await api.post(`/purchase-orders/${id}/cancel`);
      showSuccess('Orden cancelada correctamente');
      fetchOrders();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al cancelar la orden');
    }
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const handleReceive = (order) => {
    setSelectedOrder(order);
    setReceiveModalOpen(true);
  };

  const handleDownloadPO = async (orderId) => {
    try {
      const response = await api.get(`/purchase-orders/${orderId}`);
      const order = response.data.data;
      
      const doc = generatePurchaseOrderPDF(order);
      downloadPDF(doc, `Orden-Compra-${order.order_number}.pdf`);
      
      showSuccess('Orden de compra descargada correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showError('Error al generar el PDF');
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        label: 'Pendiente',
        icon: Clock,
        className: 'bg-amber-100 text-amber-700',
        iconClass: 'text-amber-600',
      },
      partial: {
        label: 'Parcial',
        icon: Package,
        className: 'bg-blue-100 text-blue-700',
        iconClass: 'text-blue-600',
      },
      received: {
        label: 'Recibida',
        icon: CheckCircle,
        className: 'bg-emerald-100 text-emerald-700',
        iconClass: 'text-emerald-600',
      },
      cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        className: 'bg-red-100 text-red-700',
        iconClass: 'text-red-600',
      },
    };
    return configs[status] || configs.pending;
  };

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Órdenes de Compra</h1>
            <p className="page-subtitle">Gestiona las órdenes de compra a proveedores</p>
          </div>
          <button 
            onClick={() => setCreateModalOpen(true)} 
            className="btn btn-primary"
            disabled={suppliers.length === 0}
          >
            <Plus className="w-4 h-4" />
            Nueva Orden
          </button>
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'partial', 'received', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusConfig(status).label}
              </button>
            ))}
          </div>
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
              No hay proveedores registrados
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Necesitas crear al menos un proveedor antes de crear órdenes de compra
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* Sin órdenes */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'all' 
                ? 'No hay órdenes de compra' 
                : `No hay órdenes ${getStatusConfig(statusFilter).label.toLowerCase()}`
              }
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Comienza creando tu primera orden de compra
            </p>
            {statusFilter === 'all' && (
              <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Crear Orden
              </button>
            )}
          </div>
        ) : (
          /* Lista de órdenes */
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div key={order.id} className="card hover:shadow-strong transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Info principal */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {order.order_number}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.className}`}>
                              <StatusIcon className={`w-3 h-3 ${statusConfig.iconClass}`} />
                              {statusConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Truck className="w-4 h-4" />
                            <span className="font-medium">{order.supplier?.name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detalles */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fecha Orden</p>
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(order.order_date).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Entrega Esperada</p>
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {order.expected_delivery_date 
                              ? new Date(order.expected_delivery_date).toLocaleDateString('es-ES')
                              : 'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Total</p>
                          <div className="flex items-center gap-1 text-sm font-bold text-gray-900">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            {order.currency?.symbol || '$'}{parseFloat(order.total).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Items</p>
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                            <Package className="w-3 h-3 text-gray-400" />
                            {order.items?.length || 0} productos
                          </div>
                        </div>
                      </div>

                      {/* Progreso para órdenes parciales */}
                      {order.status === 'partial' && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-900">
                              Progreso de Recepción
                            </span>
                            <span className="text-xs font-bold text-blue-600">
                              {order.items?.reduce((sum, item) => sum + item.quantity_received, 0)} / {' '}
                              {order.items?.reduce((sum, item) => sum + item.quantity_ordered, 0)}
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(order.items?.reduce((sum, item) => sum + item.quantity_received, 0) / order.items?.reduce((sum, item) => sum + item.quantity_ordered, 0)) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex lg:flex-col gap-2">
                      <button
                        onClick={() => handleView(order)}
                        className="flex-1 lg:flex-none btn btn-secondary text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button
                        onClick={() => handleDownloadPO(order.id)}
                        className="flex-1 lg:flex-none btn text-sm bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                      {(order.status === 'pending' || order.status === 'partial') && (
                        <button
                          onClick={() => handleReceive(order)}
                          className="flex-1 lg:flex-none btn btn-primary text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Recibir
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="flex-1 lg:flex-none btn text-sm bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {createModalOpen && (
        <PurchaseOrderModal
          suppliers={suppliers}
          onClose={() => {
            setCreateModalOpen(false);
            fetchOrders();
          }}
        />
      )}

      {receiveModalOpen && selectedOrder && (
        <ReceiveOrderModal
          order={selectedOrder}
          onClose={() => {
            setReceiveModalOpen(false);
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}

      {viewModalOpen && selectedOrder && (
        <ViewOrderModal
          order={selectedOrder}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </LayoutNew>
  );
}