import {
  Home,
  Package,
  FolderTree,
  Users,
  X,
  LogOut,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const links = [
    { to: '/dashboard', icon: Home, label: 'Dashboard', admin: false },
    { to: '/products', icon: Package, label: 'Productos', admin: false },
    { to: '/categories', icon: FolderTree, label: 'Categorías', admin: false },
    { to: '/users', icon: Users, label: 'Usuarios', admin: true },
  ];

  const filteredLinks = links.filter(
    (link) => !link.admin || isAdmin
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden z-20"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64
          bg-white border-r border-gray-200
          flex flex-col
          transition-transform duration-300 z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200">
          <h1
            onClick={() => navigate('/dashboard')}
            className="text-lg font-bold text-gray-900 cursor-pointer"
          >
            Business
          </h1>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {filteredLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-900'
                  : 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}

          {/* Profile */}
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-900'
                : 'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          >
            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
              {initial}
            </div>
            Profile
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
  