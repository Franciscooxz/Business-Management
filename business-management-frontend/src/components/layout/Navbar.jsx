import { LogOut, Menu } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Business Manager</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}