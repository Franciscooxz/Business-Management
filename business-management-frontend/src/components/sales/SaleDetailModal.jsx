import { X, User, DollarSign, Calendar, CreditCard, Package, Receipt } from 'lucide-react';

export default function SaleDetailModal({ sale, onClose }) {
  const getStatusColor = (status) => {
    const colors = {
      completada: 'text-emerald-600 bg-emerald-50',
      pendiente: 'text-amber-600 bg-amber-50',
      cancelada: 'text-red-600 bg-red-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Venta #{sale.id}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(sale.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Info del cliente y vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="card bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Cliente</h3>
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold text-gray-900">{sale.customer_name}</p>
                {sale.customer_email && (
                  <p className="text-sm text-gray-600">{sale.customer_email}</p>
                )}
                {sale.customer_phone && (
                  <p className="text-sm text-gray-600">{sale.customer_phone}</p>
                )}
              </div>
            </div>

            {/* Info de la venta */}
            <div className="card bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Información</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Vendedor:</span>
                  <span className="text-sm font-medium text-gray-900">{sale.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Método de pago:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{sale.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${getStatusColor(sale.status)}`}>
                    {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Productos</h3>
            </div>
            <div className="space-y-3">
              {sale.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">
                      ${parseFloat(item.price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ${parseFloat(item.subtotal).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
            <div className="space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  ${parseFloat(sale.subtotal).toFixed(2)}
                </span>
              </div>
              {parseFloat(sale.discount) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Descuento:</span>
                  <span className="font-semibold text-red-600">
                    -${parseFloat(sale.discount).toFixed(2)}
                  </span>
                </div>
              )}
              {parseFloat(sale.tax) > 0 && (
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Impuestos:</span>
                  <span className="font-semibold text-gray-900">
                    ${parseFloat(sale.tax).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="h-px bg-blue-300"></div>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">TOTAL:</span>
                <span className="text-3xl font-bold text-blue-600">
                  ${parseFloat(sale.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {sale.notes && (
            <div className="card bg-amber-50 border border-amber-200">
              <h3 className="font-semibold text-gray-900 mb-2">Notas:</h3>
              <p className="text-sm text-gray-700">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full btn btn-secondary"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}