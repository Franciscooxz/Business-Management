import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Agregar notificación
  addNotification: (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 50), // Máximo 50
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Marcar como leída
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  // Marcar todas como leídas
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Eliminar notificación
  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount,
      };
    });
  },

  // Limpiar todas
  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

export default useNotificationStore;