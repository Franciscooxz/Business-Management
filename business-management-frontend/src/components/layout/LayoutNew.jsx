import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  FolderTree, 
  Users, 
  LogOut, 
  X, 
  Menu,
  ShoppingCart,
  Receipt,
  UserCog,
  DollarSign,
  Truck,
  ShoppingBag,
  FileText
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import ThemeToggle from '../ThemeToggle';
import NotificationBell from '../NotificationBell';

export default function LayoutNew({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin } = useAuthStore();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Punto de Venta', to: '/pos', icon: ShoppingCart },
    { name: 'Ventas', to: '/sales', icon: Receipt },
    { name: 'Clientes', to: '/customers', icon: Users },
    { name: 'Productos', to: '/products', icon: Package },
    { name: 'Categorías', to: '/categories', icon: FolderTree },
    { name: 'Proveedores', to: '/suppliers', icon: Truck },
    { name: 'Órdenes de Compra', to: '/purchase-orders', icon: ShoppingBag },
    { name: 'Reportes', to: '/reports', icon: FileText },
    { name: 'Monedas', to: '/currencies', icon: DollarSign, adminOnly: true },
    { name: 'Usuarios', to: '/users', icon: UserCog, adminOnly: true },
  ];

  const filteredNav = navigation.filter(item => !item.adminOnly || isAdmin());

  const handleLogout = () => {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:bg-white dark:lg:bg-gray-800 lg:border-r lg:border-gray-200 dark:lg:border-gray-700">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-base">BM</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Business</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manager</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon 
                    className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} 
                    strokeWidth={2}
                  />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Profile + Theme Toggle + Notifications */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Notificaciones + Theme Toggle */}
          <div className="flex justify-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center">
              <span className="text-blue-700 dark:text-blue-300 font-semibold text-base">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BM</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">Business Manager</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl flex flex-col animate-slide-in-left">
              {/* Logo */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-base">BM</span>
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-gray-900 dark:text-white">Business</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {filteredNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon 
                          className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} 
                          strokeWidth={2}
                        />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {/* User Profile */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 dark:text-blue-300 font-semibold text-base">
                      {user?.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md transition-all"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 bg-gray-50 dark:bg-gray-900">
        <div className="pt-16 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}