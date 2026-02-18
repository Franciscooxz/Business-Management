import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, DollarSign } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function CurrencyModal({ currency, onClose }) {
  const isEditing = !!currency;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    defaultValues: {
      code: '',
      name: '',
      symbol: '',
      exchange_rate: '',
      is_active: true,
    }
  });

  useEffect(() => {
    if (currency) {
      setValue('code', currency.code || '');
      setValue('name', currency.name || '');
      setValue('symbol', currency.symbol || '');
      setValue('exchange_rate', currency.exchange_rate || '');
      setValue('is_active', currency.is_active);
    }
  }, [currency, setValue]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        code: data.code.toUpperCase(),
        name: data.name,
        symbol: data.symbol,
        exchange_rate: parseFloat(data.exchange_rate),
        is_active: data.is_active,
      };

      if (isEditing) {
        await api.put(`/currencies/${currency.id}`, payload);
        showSuccess('Moneda actualizada correctamente');
      } else {
        await api.post('/currencies', payload);
        showSuccess('Moneda creada correctamente');
      }
      onClose();
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors?.code) {
        showError('Este código de moneda ya está registrado');
      } else {
        showError('Error al guardar la moneda');
      }
      console.error('Error:', error.response?.data || error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Moneda' : 'Nueva Moneda'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing ? 'Actualiza la información' : 'Completa los datos de la moneda'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Código */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Código (ISO 4217) *
            </label>
            <input
              type="text"
              maxLength="3"
              {...register('code', { 
                required: 'El código es requerido',
                pattern: {
                  value: /^[A-Z]{3}$/i,
                  message: 'Debe ser un código de 3 letras (ej: USD, EUR)'
                }
              })}
              className="input uppercase"
              placeholder="USD"
              disabled={isEditing && currency?.is_base}
            />
            {errors.code && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.code.message}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Dólar Estadounidense"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Símbolo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Símbolo *
            </label>
            <input
              type="text"
              maxLength="10"
              {...register('symbol', { required: 'El símbolo es requerido' })}
              className="input"
              placeholder="$"
            />
            {errors.symbol && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.symbol.message}
              </p>
            )}
          </div>

          {/* Tasa de cambio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tasa de Cambio *
            </label>
            <input
              type="number"
              step="0.000001"
              {...register('exchange_rate', { 
                required: 'La tasa de cambio es requerida',
                min: { value: 0, message: 'Debe ser mayor a 0' }
              })}
              className="input"
              placeholder="1.000000"
              disabled={currency?.is_base}
            />
            {errors.exchange_rate && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.exchange_rate.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {currency?.is_base 
                ? 'La moneda base siempre tiene tasa 1.0' 
                : 'Cuántas unidades de esta moneda equivalen a 1 unidad de la moneda base'}
            </p>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
              Moneda activa
            </label>
          </div>

          {/* Advertencia si es moneda base */}
          {currency?.is_base && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ⚠️ Esta es la moneda base del sistema. No puedes cambiar su código ni tasa de cambio.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                isEditing ? 'Actualizar' : 'Crear Moneda'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}