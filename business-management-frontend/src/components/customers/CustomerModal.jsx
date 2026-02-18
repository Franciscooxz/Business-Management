import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, User as UserIcon } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function CustomerModal({ customer, onClose }) {
  const isEditing = !!customer;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    }
  });

  useEffect(() => {
    if (customer) {
      setValue('name', customer.name || '');
      setValue('email', customer.email || '');
      setValue('phone', customer.phone || '');
      setValue('address', customer.address || '');
    }
  }, [customer, setValue]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await api.put(`/customers/${customer.id}`, data);
        showSuccess('Cliente actualizado correctamente');
      } else {
        await api.post('/customers', data);
        showSuccess('Cliente creado correctamente');
      }
      onClose();
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors?.email) {
        showError('Este email ya está registrado');
      } else {
        showError('Error al guardar el cliente');
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
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing ? 'Actualiza la información' : 'Completa los datos del cliente'}
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
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Juan Pérez"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              {...register('email', {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido'
                }
              })}
              className="input"
              placeholder="juan@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              {...register('phone')}
              className="input"
              placeholder="+57 300 123 4567"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dirección
            </label>
            <textarea
              {...register('address')}
              rows={2}
              className="input resize-none"
              placeholder="Calle 123 #45-67"
            />
          </div>

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
                isEditing ? 'Actualizar' : 'Crear Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}