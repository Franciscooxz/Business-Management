import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

export default function UserModal({ user, roles, onClose }) {
  const isEditing = !!user;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: user || { is_active: true }
  });

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (isEditing && !data.password) {
        delete payload.password;
      }

      if (isEditing) {
        await api.put(`/users/${user.id}`, payload);
        showSuccess('Usuario actualizado correctamente');
      } else {
        await api.post('/users', payload);
        showSuccess('Usuario creado correctamente');
      }
      onClose();
    } catch (error) {
      showError('Error al guardar el usuario');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              {...register('name', { required: 'El nombre es requerido' })}
              className="input"
              placeholder="Juan Pérez"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              {...register('email', { 
                required: 'El email es requerido',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email inválido'
                }
              })}
              className="input"
              placeholder="usuario@example.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña {isEditing && '(dejar vacío para mantener actual)'}
            </label>
            <input
              type="password"
              {...register('password', { 
                required: isEditing ? false : 'La contraseña es requerida',
                minLength: {
                  value: 8,
                  message: 'Mínimo 8 caracteres'
                }
              })}
              className="input"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol *
            </label>
            <select
              {...register('role_id', { required: 'El rol es requerido' })}
              className="input"
            >
              <option value="">Selecciona un rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name === 'admin' ? 'Administrador' : 'Usuario'}
                </option>
              ))}
            </select>
            {errors.role_id && (
              <p className="text-red-500 text-sm mt-1">{errors.role_id.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}