import { useState, useRef, useEffect } from 'react';
import { Bell, X, Package, AlertCircle, ShoppingBag, Check } from 'lucide-react';
import useNotificationStore from '../store/notificationStore';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotificationStore();

  // Determinar posición del dropdown
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Si hay menos de 400px abajo, abrirlo hacia arriba
      if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    const icons = {
      stock: AlertCircle,
      sale: ShoppingBag,
      order: Package,
      success: Check,
    };
    const Icon = icons[type] || Bell;
    return Icon;
  };

  const getIconColor = (type) => {
    const colors = {
      stock: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
      sale: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      order: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
      success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
    };
    return colors[type] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // segundos

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return `Hace ${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute ${
            dropdownPosition === 'top' 
              ? 'bottom-full mb-2' 
              : 'top-full mt-2'
          } left-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-strong border border-gray-200 dark:border-gray-700 z-50 animate-slide-in`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white">
              Notificaciones {unreadCount > 0 && `(${unreadCount})`}
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay notificaciones
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  const iconColor = getIconColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Marcar leída
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}