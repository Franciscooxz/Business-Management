import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Función LOGIN
      login: async (email, password) => {
        try {
          console.log('📤 Enviando login request'); // Debug
          
          const response = await api.post('/login', {
            email,
            password,
          });

          console.log('📥 Respuesta del servidor:', response.data); // Debug

          // Extraer datos de la respuesta (según tu AuthController)
          const user = response.data.data.user;
          const token = response.data.data.access_token;

          // Guardar en localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));

          // Configurar token para futuras peticiones
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Actualizar estado de Zustand
          set({
            user,
            token,
            isAuthenticated: true,
          });

          return { user, token };
        } catch (error) {
          console.error('❌ Error en login:', error.response?.data || error);
          throw error;
        }
      },

      // Función REGISTER
      register: async (name, email, password) => {
        try {
          console.log('📤 Enviando register request'); // Debug
          
          const response = await api.post('/register', {
            name,
            email,
            password,
            password_confirmation: password,
          });

          console.log('📥 Respuesta del servidor:', response.data); // Debug

          // Extraer datos de la respuesta
          const user = response.data.data.user;
          const token = response.data.data.access_token;

          // Guardar en localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));

          // Configurar token para futuras peticiones
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Actualizar estado
          set({
            user,
            token,
            isAuthenticated: true,
          });

          return { user, token };
        } catch (error) {
          console.error('❌ Error en register:', error.response?.data || error);
          throw error;
        }
      },

      // Función setAuth (mantener por compatibilidad)
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },

      // Función LOGOUT
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      // Función para verificar si es admin
      isAdmin: () => {
        const state = get();
        return state.user?.role === 'admin';
      },

      // Función para verificar autenticación (útil para rutas protegidas)
      checkAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            set({
              user,
              token,
              isAuthenticated: true,
            });
            return true;
          } catch (error) {
            console.error('Error parsing user:', error);
            return false;
          }
        }
        return false;
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;