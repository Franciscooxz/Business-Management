import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Truck } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function SupplierModal({ supplier, onClose }) {
  const isEditing = !!supplier;
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm({
    defaultValues: {
      name: '',
      company_name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      notes: '',
      is_active: true,
    }
  });

  useEffect(() => {
    if (supplier) {
      setValue('name', supplier.name || '');
      setValue('company_name', supplier.company_name || '');
      setValue('tax_id', supplier.tax_id || '');
      setValue('email', supplier.email || '');
      setValue('phone', supplier.phone || '');
      setValue('address', supplier.address || '');
      setValue('city', supplier.city || '');
      setValue('country', supplier.country || '');
      setValue('notes', supplier.notes || '');
      setValue('is_active', supplier.is_active);
    }
  }, [supplier, setValue]);

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await api.put(`/suppliers/${supplier.id}`, data);
        showSuccess('Proveedor actualizado correctamente');
      } else {
        await api.post('/suppliers', data);
        showSuccess('Proveedor creado correctamente');
      }
      onClose();
    } catch (error) {
      showError('Error al guardar el proveedor');
      console.error('Error:', error.response?.data || error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing ? 'Actualiza la información' : 'Completa los datos del proveedor'}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                {...register('name', { required: 'El nombre es requerido' })}
                className="input"
                placeholder="Ej: Distribuidora ABC"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Nombre de empresa */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Razón Social
              </label>
              <input
                type="text"
                {...register('company_name')}
                className="input"
                placeholder="Ej: ABC Distribuidora S.A."
              />
            </div>

            {/* NIT/RUT */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                NIT/RUT/RFC
              </label>
              <input
                type="text"
                {...register('tax_id')}
                className="input"
                placeholder="123456789-0"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="input"
                placeholder="contacto@proveedor.com"
              />
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

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                {...register('city')}
                className="input"
                placeholder="Bogotá"
              />
            </div>

            {/* País */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                País
              </label>
              <input
                type="text"
                {...register('country')}
                className="input"
                placeholder="Colombia"
              />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Dirección
              </label>
              <textarea
                {...register('address')}
                className="input"
                rows="2"
                placeholder="Calle 123 # 45-67, Barrio Centro"
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                {...register('notes')}
                className="input"
                rows="3"
                placeholder="Información adicional sobre el proveedor..."
              />
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
              Proveedor activo
            </label>
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
                isEditing ? 'Actualizar' : 'Crear Proveedor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}