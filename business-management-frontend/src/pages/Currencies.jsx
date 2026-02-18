import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Globe } from 'lucide-react';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import CurrencyModal from '../components/currencies/CurrencyModal';
import { showSuccess, showError } from '../utils/toast';

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [updatingRates, setUpdatingRates] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // 👇 TODAS LAS FUNCIONES PRIMERO
  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/currencies');
      setCurrencies(response.data.data);
    } catch (error) {
      console.error('Error al cargar monedas:', error);
      showError('Error al cargar monedas');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastUpdate = async () => {
    try {
      const response = await api.get('/currencies/last-update');
      setLastUpdate(response.data.data.latest_update);
    } catch (error) {
      console.error('Error al cargar última actualización:', error);
    }
  };

  const handleUpdateRates = async () => {
    if (!confirm('¿Deseas actualizar las tasas de cambio desde la API?')) return;

    try {
      setUpdatingRates(true);
      const response = await api.post('/currencies/update-rates');
      
      const { updated, errors } = response.data.data;
      
      if (updated.length > 0) {
        showSuccess(`${updated.length} tasas actualizadas correctamente`);
        fetchCurrencies();
        fetchLastUpdate();
      }
      
      if (errors.length > 0) {
        console.warn('No se pudieron actualizar:', errors);
      }
    } catch (error) {
      console.error('Error al actualizar tasas:', error);
      showError('Error al actualizar las tasas de cambio');
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleDelete = async (id, isBase) => {
    if (isBase) {
      showError('No se puede eliminar la moneda base');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta moneda?')) return;

    try {
      await api.delete(`/currencies/${id}`);
      showSuccess('Moneda eliminada correctamente');
      fetchCurrencies();
    } catch (error) {
      if (error.response?.status === 409) {
        showError('No se puede eliminar una moneda con productos o ventas asociadas');
      } else {
        showError('Error al eliminar la moneda');
      }
    }
  };

  const handleEdit = (currency) => {
    setEditingCurrency(currency);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingCurrency(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCurrency(null);
    fetchCurrencies();
  };

  // 👇 useEffect AL FINAL, DESPUÉS DE TODAS LAS FUNCIONES
  useEffect(() => {
    fetchCurrencies();
    fetchLastUpdate();
  }, []);

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="page-header">
            <h1 className="page-title">Monedas</h1>
            <p className="page-subtitle">Gestiona las monedas del sistema y tasas de cambio</p>
            {lastUpdate && (
              <p className="text-sm text-gray-500 mt-1">
                Última actualización: {new Date(lastUpdate).toLocaleString('es-ES')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpdateRates}
              disabled={updatingRates}
              className="btn btn-secondary"
            >
              {updatingRates ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  Actualizando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Actualizar Tasas
                </span>
              )}
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Nueva Moneda
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : currencies.length === 0 ? (
          /* Sin monedas */
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay monedas configuradas</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Comienza agregando las monedas que utilizarás en el sistema
            </p>
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Crear Moneda
            </button>
          </div>
        ) : (
          /* Grid de monedas */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currencies.map((currency) => (
              <div 
                key={currency.id} 
                className={`card group hover:shadow-strong transition-all duration-200 ${
                  currency.is_base ? 'border-2 border-emerald-500 bg-emerald-50' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      currency.is_base 
                        ? 'bg-emerald-600' 
                        : 'bg-gradient-to-br from-blue-100 to-blue-200'
                    }`}>
                      <span className={`text-xl font-bold ${
                        currency.is_base ? 'text-white' : 'text-blue-700'
                      }`}>
                        {currency.symbol}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {currency.code}
                      </h3>
                      <p className="text-sm text-gray-600">{currency.name}</p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    currency.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                  }`} />
                </div>

                {/* Tasa de cambio */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-600">Tasa de Cambio</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {parseFloat(currency.exchange_rate).toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currency.is_base ? 'Moneda base' : 'Respecto a moneda base'}
                    </p>
                  </div>
                </div>

                {/* Última actualización */}
                {currency.last_updated && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Actualizado: {new Date(currency.last_updated).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}

                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {currency.is_base && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                      Base
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                    currency.is_active 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {currency.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-1 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(currency)}
                    className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  {!currency.is_base && (
                    <button
                      onClick={() => handleDelete(currency.id, currency.is_base)}
                      className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Información adicional */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Sobre las tasas de cambio</h3>
              <p className="text-sm text-blue-800">
                La tasa de cambio indica cuántas unidades de esta moneda equivalen a 1 unidad de la moneda base. 
                Por ejemplo, si USD es la moneda base y COP tiene tasa 3900, significa que 1 USD = 3900 COP.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <CurrencyModal
          currency={editingCurrency}
          onClose={handleModalClose}
        />
      )}
    </LayoutNew>
  );
}