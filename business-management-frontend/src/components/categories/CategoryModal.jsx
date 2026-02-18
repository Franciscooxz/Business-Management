import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function CategoryModal({ category, onClose }) {
  const isEditing = !!category;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: category || { is_active: true }
  });

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await api.put(`/categories/${category.id}`, data);
        showSuccess('Categoría actualizada correctamente');
      } else {
        await api.post('/categories', data);
        showSuccess('Categoría creada correctamente');
      }
      onClose();
    } catch (error) {
      showError('Error al guardar la categoría');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditing ? 'Actualiza la información' : 'Crea una nueva categoría'}
            </p>
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
              Nombre *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Ej: Electrónica"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="input resize-none"
              placeholder="Descripción de la categoría..."
            />
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
              Categoría activa
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
                isEditing ? 'Actualizar' : 'Crear'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}