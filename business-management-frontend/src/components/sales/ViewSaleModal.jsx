import { X, ShoppingCart, Calendar, DollarSign, User, CreditCard, Package, Download } from 'lucide-react';
import { generateSaleInvoice, downloadPDF } from '../../utils/pdfGenerator';

export default function ViewSaleModal({ sale, onClose }) {
  const handleDownloadInvoice = () => {
    try {
      const doc = generateSaleInvoice(sale);
      downloadPDF(doc, `Factura-${sale.id.toString().padStart(6, '0')}.pdf`);
    } catch (error) {
      console.error('Error al generar factura:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      pendiente: 'bg-amber-100 text-amber-700 border-amber-200',
      cancelada: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || colors.completada;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-slide-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Venta #{sale.id}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(sale.status)}`}>
                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-500">Detalles de la venta</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información del cliente */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-blue-900">Cliente</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700 mb-1">Nombre</p>
                <p className="font-semibold text-blue-900">{sale.customer_name}</p>
              </div>
              {sale.customer_email && (
                <div>
                  <p className="text-sm text-blue-700 mb-1">Email</p>
                  <p className="font-semibold text-blue-900">{sale.customer_email}</p>
                </div>
              )}
              {sale.customer_phone && (
                <div>
                  <p className="text-sm text-blue-700 mb-1">Teléfono</p>
                  <p className="font-semibold text-blue-900">{sale.customer_phone}</p>
                </div>
              )}
              {sale.user && (
                <div>
                  <p className="text-sm text-blue-700 mb-1">Vendedor</p>
                  <p className="font-semibold text-blue-900">{sale.user.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información de la venta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">Fecha</p>
              </div>
              <p className="font-bold text-gray-900">
                {new Date(sale.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-600">Método de Pago</p>
              </div>
              <p className="font-bold text-gray-900 capitalize">{sale.payment_method}</p>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Productos</h3>
            <div className="space-y-3">
              {sale.items?.map((item, index) => (
                <div key={index} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.product?.name || 'Producto'}</h4>
                        <p className="text-sm text-gray-600">
                          Cantidad: <span className="font-medium">{item.quantity}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Precio unitario</p>
                      <p className="font-bold text-gray-900">
                        ${parseFloat(item.price).toFixed(2)}
                      </p>
                      <p className="text-sm text-blue-600 font-semibold mt-1">
                        Subtotal: ${(item.quantity * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-emerald-900">Resumen</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-emerald-700">Subtotal:</span>
                <span className="font-semibold text-emerald-900">
                  ${parseFloat(sale.subtotal).toFixed(2)}
                </span>
              </div>
              {parseFloat(sale.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-700">Descuento:</span>
                  <span className="font-semibold text-red-600">
                    -${parseFloat(sale.discount).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-emerald-700">Impuestos:</span>
                <span className="font-semibold text-emerald-900">
                  ${parseFloat(sale.tax).toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-emerald-300"></div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-emerald-900">TOTAL:</span>
                <span className="text-2xl font-bold text-emerald-600">
                  ${parseFloat(sale.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {sale.notes && (
            <div className="card bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Notas</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleDownloadInvoice}
            className="flex-1 btn bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
          >
            <Download className="w-4 h-4" />
            Descargar Factura
          </button>
          <button onClick={onClose} className="flex-1 btn btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}