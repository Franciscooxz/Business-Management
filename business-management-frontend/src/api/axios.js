import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Agregar token y company_id
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const user = localStorage.getItem('user');
    if (user) {
      try {
        const parsed = JSON.parse(user);
        if (parsed.company_id) {
          config.headers['X-Company-Id'] = parsed.company_id;
        }
      } catch {
        // invalid JSON, ignore
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Manejo de errores global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Error de red (API no responde)
    if (!error.response) {
      console.error('Error de red:', error);
      
      // Mostrar toast de error de conexión
      if (window.showError) {
        window.showError('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
      
      return Promise.reject({
        message: 'Error de conexión',
        type: 'network',
      });
    }

    const { status, data } = error.response;

    // 401 - No autorizado (token expirado o inválido)
    if (status === 401) {
      console.warn('Sesión expirada');
      
      // Limpiar localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Mostrar mensaje
      if (window.showError) {
        window.showError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
      return Promise.reject({
        message: 'Sesión expirada',
        type: 'auth',
      });
    }

    // 403 - Prohibido (sin permisos)
    if (status === 403) {
      if (window.showError) {
        window.showError('No tienes permisos para realizar esta acción.');
      }
      
      return Promise.reject({
        message: 'Sin permisos',
        type: 'permission',
      });
    }

    // 404 - No encontrado
    if (status === 404) {
      if (window.showError) {
        window.showError(data.message || 'Recurso no encontrado.');
      }
      
      return Promise.reject({
        message: data.message || 'No encontrado',
        type: 'not_found',
      });
    }

    // 422 - Validación fallida
    if (status === 422) {
      const validationErrors = data.errors || {};
      const firstError = Object.values(validationErrors)[0]?.[0] || data.message || 'Error de validación';
      
      if (window.showError) {
        window.showError(firstError);
      }
      
      return Promise.reject({
        message: firstError,
        errors: validationErrors,
        type: 'validation',
      });
    }

    // 500 - Error del servidor
    if (status === 500) {
      if (window.showError) {
        window.showError('Error interno del servidor. Intenta nuevamente más tarde.');
      }
      
      return Promise.reject({
        message: 'Error del servidor',
        type: 'server',
      });
    }

    // Otros errores
    const errorMessage = data.message || 'Ocurrió un error inesperado';
    if (window.showError) {
      window.showError(errorMessage);
    }

    return Promise.reject({
      message: errorMessage,
      type: 'unknown',
      status,
    });
  }
);

export default api;