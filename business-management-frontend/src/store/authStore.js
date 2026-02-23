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
      company: null,
      permissions: [],
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/login', { email, password });

        const { user, access_token: token } = response.data.data;
        const company = user.company ?? null;
        const permissions = user.permissions ?? [];

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({ user, token, company, permissions, isAuthenticated: true });

        return { user, token };
      },

      register: async (name, email, password) => {
        const response = await api.post('/register', {
          name,
          email,
          password,
          password_confirmation: password,
        });

        const { user, access_token: token } = response.data.data;
        const company = user.company ?? null;
        const permissions = user.permissions ?? [];

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        set({ user, token, company, permissions, isAuthenticated: true });

        return { user, token };
      },

      setAuth: (user, token) => {
        const company = user.company ?? null;
        const permissions = user.permissions ?? [];
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, company, permissions, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null, company: null, permissions: [], isAuthenticated: false });
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin' || user?.roles?.includes('admin') || user?.roles?.includes('super_admin');
      },

      hasPermission: (permission) => {
        const { permissions, user } = get();
        if (!user) return false;
        if (user.role === 'admin' || user.roles?.includes('super_admin')) return true;
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissionList) => {
        const { hasPermission } = get();
        return permissionList.some((p) => hasPermission(p));
      },

      checkAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            const company = user.company ?? null;
            const permissions = user.permissions ?? [];
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            set({ user, token, company, permissions, isAuthenticated: true });
            return true;
          } catch {
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
