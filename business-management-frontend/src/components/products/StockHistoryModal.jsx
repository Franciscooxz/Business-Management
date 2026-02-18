import { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import api from '../../api/axios';
import { showError } from '../../utils/toast';

export default function StockHistoryModal({ product, onClose }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products/${product.id}/stock-movements`);
      setMovements(response.data.data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      showError('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'entrada':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'salida':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeBadge = (type) => {
    const styles = {
      entrada: 'bg-green-100 text-green-700',
      salida: 'bg-red-100 text-red-700',
      ajuste: 'bg-blue-100 text-blue-700',
      inicial: 'bg-purple-100 text-purple-700',
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[type] || styles.ajuste}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Historial de Stock</h2>
            <p className="text-sm text-gray-600 mt-1">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button> 
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((movement) => (
                <div key={movement.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      {getTypeIcon(movement.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeBadge(movement.type)}
                          <span className={`font-semibold ${
                            movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(movement.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>
                          Stock anterior: <span className="font-medium">{movement.previous_stock}</span>
                        </span>
                        <span>→</span>
                        <span>
                          Stock nuevo: <span className="font-medium">{movement.new_stock}</span>
                        </span>
                      </div>

                      {movement.reason && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {movement.reason}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Por: {movement.user.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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