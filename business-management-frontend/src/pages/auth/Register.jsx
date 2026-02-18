import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { showSuccess, showError } from '../../utils/toast';

export default function Register() {
  const { register: registerForm, handleSubmit, formState: { errors }, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerUser = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const password = watch('password');

  const onSubmit = async (data) => {
    if (data.password !== data.password_confirmation) {
      showError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Registrando usuario:', data.email);
      
      const response = await registerUser(data.name, data.email, data.password);
      
      console.log('✅ Registro exitoso:', response);
      showSuccess('¡Cuenta creada exitosamente!');
      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Error en registro:', err);
      console.error('❌ Error response:', err.response?.data);
      
      if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        if (errors?.email) {
          showError('Este email ya está registrado');
        } else {
          showError('Datos inválidos. Verifica los campos.');
        }
      } else if (err.response?.data?.message) {
        showError(err.response.data.message);
      } else {
        showError('Error al crear la cuenta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Gradient */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]"></div>
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold mb-6">
              Únete a nosotros
            </h1>
            <p className="text-xl text-emerald-100 leading-relaxed mb-8">
              Crea tu cuenta y comienza a gestionar tu negocio de manera profesional y eficiente.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✓</div>
                <span className="text-emerald-50">Gestión de inventario completa</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✓</div>
                <span className="text-emerald-50">Reportes y análisis en tiempo real</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✓</div>
                <span className="text-emerald-50">Control de usuarios y permisos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-lg mb-6">
              <span className="text-white font-bold text-2xl">BM</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Crear cuenta nueva
            </h2>
            <p className="text-base text-gray-600">
              Completa tus datos para registrarte
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  {...registerForm('name', { required: 'El nombre es requerido' })}
                  className="input pl-10"
                  placeholder="Juan Pérez"
                />
              </div>
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  {...registerForm('email', { 
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido'
                    }
                  })}
                  className="input pl-10"
                  placeholder="tu@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...registerForm('password', { 
                    required: 'La contraseña es requerida',
                    minLength: {
                      value: 8,
                      message: 'Mínimo 8 caracteres'
                    }
                  })}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...registerForm('password_confirmation', { 
                    required: 'Confirma tu contraseña',
                    validate: value => value === password || 'Las contraseñas no coinciden'
                  })}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password_confirmation && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.password_confirmation.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn py-3 text-base group bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md active:scale-95 transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creando cuenta...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Crear Cuenta
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-base text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link 
                to="/login" 
                className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Inicia sesión
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}