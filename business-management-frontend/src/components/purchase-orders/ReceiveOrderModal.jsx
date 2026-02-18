import { useState } from 'react';
import { X, CheckCircle, Package } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function ReceiveOrderModal({ order, onClose }) {
  const [items, setItems] = useState(
    order.items.map(item => ({
      item_id: item.id,
      product_name: item.product.name,
      quantity_ordered: item.quantity_ordered,
      quantity_received: item.quantity_received,
      quantity_pending: item.quantity_ordered - item.quantity_received,
      quantity_to_receive: item.quantity_ordered - item.quantity_received,
    }))
  );
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateQuantity = (itemId, value) => {
    setItems(items.map(item => {
      if (item.item_id === itemId) {
        const newValue = Math.max(0, Math.min(item.quantity_pending, parseInt(value) || 0));
        return { ...item, quantity_to_receive: newValue };
      }
      return item;
    }));
  };

  const receiveAll = () => {
    setItems(items.map(item => ({
      ...item,
      quantity_to_receive: item.quantity_pending
    })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const itemsToReceive = items
      .filter(item => item.quantity_to_receive > 0)
      .map(item => ({
        item_id: item.item_id,
        quantity_received: item.quantity_to_receive,
      }));

    if (itemsToReceive.length === 0) {
      showError('Debes ingresar al menos una cantidad a recibir');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/purchase-orders/${order.id}/receive`, {
        items: itemsToReceive,
        received_date: receivedDate,
      });
      showSuccess('Mercancía recibida correctamente');
      onClose();
    } catch (error) {
      showError(error.response?.data?.message || 'Error al recibir mercancía');
      console.error('Error:', error.response?.data || error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalToReceive = items.reduce((sum, item) => sum + item.quantity_to_receive, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-slide-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recibir Mercancía</h2>
              <p className="text-sm text-gray-500 mt-1">
                Orden {order.order_number} - {order.supplier.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Fecha de recepción */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha de Recepción
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <button
              type="button"
              onClick={receiveAll}
              className="btn btn-secondary mt-7"
            >
              Recibir Todo
            </button>
          </div>

          {/* Información de la orden */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-xs text-blue-700 mb-1">Total Ordenado</p>
              <p className="text-xl font-bold text-blue-900">
                {items.reduce((sum, item) => sum + item.quantity_ordered, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-emerald-700 mb-1">Ya Recibido</p>
              <p className="text-xl font-bold text-emerald-900">
                {items.reduce((sum, item) => sum + item.quantity_received, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-amber-700 mb-1">Pendiente</p>
              <p className="text-xl font-bold text-amber-900">
                {items.reduce((sum, item) => sum + item.quantity_pending, 0)}
              </p>
            </div>
          </div>

          {/* Lista de productos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Productos
            </label>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.item_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600">
                            Ordenado: <span className="font-semibold">{item.quantity_ordered}</span>
                          </span>
                          <span className="text-xs text-emerald-600">
                            Recibido: <span className="font-semibold">{item.quantity_received}</span>
                          </span>
                          <span className="text-xs text-amber-600">
                            Pendiente: <span className="font-semibold">{item.quantity_pending}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cantidad a Recibir
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity_pending}
                        value={item.quantity_to_receive}
                        onChange={(e) => updateQuantity(item.item_id, e.target.value)}
                        className="input"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quedará Recibido
                      </label>
                      <input
                        type="text"
                        value={item.quantity_received + item.quantity_to_receive}
                        disabled
                        className="input bg-gray-100 text-gray-700 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso</span>
                      <span className="font-semibold">
                        {Math.round(((item.quantity_received + item.quantity_to_receive) / item.quantity_ordered) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${((item.quantity_received + item.quantity_to_receive) / item.quantity_ordered) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700 mb-1">Total a Recibir Ahora</p>
                <p className="text-3xl font-bold text-emerald-600">{totalToReceive}</p>
              </div>
              {totalToReceive === items.reduce((sum, item) => sum + item.quantity_pending, 0) && (
                <div className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">
                  ✓ Orden Completa
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalToReceive === 0}
              className="flex-1 btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Recibiendo...
                </span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Recepción
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}