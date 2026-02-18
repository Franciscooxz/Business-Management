import { X, Truck, Calendar, DollarSign, Package, User, Clock, CheckCircle, XCircle, Download } from 'lucide-react';
import { generatePurchaseOrderPDF, downloadPDF } from '../../utils/pdfGenerator';

export default function ViewOrderModal({ order, onClose }) {

    const handleDownloadPDF = () => {
      try {
        const doc = generatePurchaseOrderPDF(order);
        downloadPDF(doc, `Orden-Compra-${order.order_number}.pdf`);
      } catch (error) {
        console.error('Error al generar PDF:', error);
      }
    };
  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        label: 'Pendiente',
        icon: Clock,
        className: 'bg-amber-100 text-amber-700 border-amber-200',
      },
      partial: {
        label: 'Parcial',
        icon: Package,
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      received: {
        label: 'Recibida',
        icon: CheckCircle,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      },
      cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        className: 'bg-red-100 text-red-700 border-red-200',
      },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-slide-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{order.order_number}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 border-2 ${statusConfig.className}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">Detalles de la orden de compra</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información del proveedor */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-bold text-purple-900">Proveedor</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-purple-700 mb-1">Nombre</p>
                <p className="font-semibold text-purple-900">{order.supplier.name}</p>
              </div>
              {order.supplier.company_name && (
                <div>
                  <p className="text-sm text-purple-700 mb-1">Razón Social</p>
                  <p className="font-semibold text-purple-900">{order.supplier.company_name}</p>
                </div>
              )}
              {order.supplier.email && (
                <div>
                  <p className="text-sm text-purple-700 mb-1">Email</p>
                  <p className="font-semibold text-purple-900">{order.supplier.email}</p>
                </div>
              )}
              {order.supplier.phone && (
                <div>
                  <p className="text-sm text-purple-700 mb-1">Teléfono</p>
                  <p className="font-semibold text-purple-900">{order.supplier.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información de la orden */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">Fecha Orden</p>
              </div>
              <p className="font-bold text-gray-900">
                {new Date(order.order_date).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">Entrega Esperada</p>
              </div>
              <p className="font-bold text-gray-900">
                {order.expected_delivery_date
                  ? new Date(order.expected_delivery_date).toLocaleDateString('es-ES')
                  : 'N/A'}
              </p>
            </div>
            {order.received_date && (
              <div className="card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs text-gray-600">Fecha Recepción</p>
                </div>
                <p className="font-bold text-gray-900">
                  {new Date(order.received_date).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">Creado por</p>
              </div>
              <p className="font-bold text-gray-900">{order.user.name}</p>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Productos</h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{item.product.name}</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Ordenado</p>
                          <p className="font-bold text-gray-900">{item.quantity_ordered}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Recibido</p>
                          <p className="font-bold text-emerald-600">{item.quantity_received}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Costo Unitario</p>
                          <p className="font-bold text-gray-900">
                            {order.currency?.symbol || '$'}{parseFloat(item.unit_cost).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Subtotal</p>
                          <p className="font-bold text-gray-900">
                            {order.currency?.symbol || '$'}{parseFloat(item.subtotal).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {/* Barra de progreso */}
                      {order.status !== 'cancelled' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso de recepción</span>
                            <span className="font-semibold">
                              {Math.round((item.quantity_received / item.quantity_ordered) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(item.quantity_received / item.quantity_ordered) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-blue-900">Resumen Financiero</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-700">Subtotal:</span>
                <span className="font-semibold text-blue-900">
                  {order.currency?.symbol || '$'}{parseFloat(order.subtotal).toFixed(2)}
                </span>
              </div>
              {parseFloat(order.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Impuestos:</span>
                  <span className="font-semibold text-blue-900">
                    {order.currency?.symbol || '$'}{parseFloat(order.tax).toFixed(2)}
                  </span>
                </div>
              )}
              {parseFloat(order.shipping) > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-700">Envío:</span>
                  <span className="font-semibold text-blue-900">
                    {order.currency?.symbol || '$'}{parseFloat(order.shipping).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="h-px bg-blue-300"></div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-blue-900">TOTAL:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {order.currency?.symbol || '$'}{parseFloat(order.total).toFixed(2)}
                </span>
              </div>
              {order.currency && (
                <p className="text-xs text-blue-700 text-center">
                  {order.currency.code} ({order.currency.name})
                </p>
              )}
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div className="card bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Notas</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 btn bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200"
          >
            <Download className="w-4 h-4" />
            Descargar PDF
          </button>
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}