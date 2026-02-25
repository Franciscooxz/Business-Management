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
  FileText,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Layers,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Users2,
  Building2,
  ChevronDown,
  ChevronRight,
  Scale,
  BarChart3,
  PieChart,
  BookMarked,
  Wallet,
  FileClock,
  Settings,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { usePermission } from '../../hooks/usePermission';
import ThemeToggle from '../ThemeToggle';
import NotificationBell from '../NotificationBell';

const navigationGroups = [
  {
    label: null,
    items: [
      { name: 'Panel Principal', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { name: 'Punto de Venta', to: '/pos', icon: ShoppingCart, permission: 'invoices.create' },
      { name: 'Facturacion Electronica', to: '/electronic-invoice/invoices', icon: Receipt, permission: 'invoices.view' },
      { name: 'Terceros', to: '/third-parties', icon: Users2, permission: 'third_parties.view' },
      { name: 'Ventas', to: '/sales', icon: Banknote },
      { name: 'Clientes', to: '/customers', icon: Users },
    ],
  },
  {
    label: 'Contabilidad',
    items: [
      { name: 'Plan de Cuentas', to: '/accounting/puc', icon: BookOpen, permission: 'accounting.view' },
      { name: 'Comprobantes', to: '/accounting/vouchers', icon: ClipboardList, permission: 'accounting.view' },
      { name: 'Periodos', to: '/accounting/periods', icon: CalendarDays, permission: 'accounting.close_period' },
      { name: 'Centros de Costo', to: '/accounting/cost-centers', icon: Layers, permission: 'accounting.view' },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { name: 'Productos', to: '/products', icon: Package },
      { name: 'Categorias', to: '/categories', icon: FolderTree },
      { name: 'Kardex', to: '/inventory/kardex', icon: FileClock, permission: 'inventory.view' },
    ],
  },
  {
    label: 'Tesoreria',
    items: [
      { name: 'Cuentas Bancarias', to: '/treasury/accounts',  icon: CreditCard,  permission: 'treasury.view' },
      { name: 'Movimientos',       to: '/treasury/movements', icon: ArrowLeftRight, permission: 'treasury.view' },
      { name: 'CxC',               to: '/treasury/receivable',icon: TrendingUp,  permission: 'treasury.view' },
      { name: 'CxP',               to: '/treasury/payable',   icon: TrendingDown,permission: 'treasury.view' },
      { name: 'Flujo de Caja',     to: '/treasury/cash-flow', icon: BarChart3,   permission: 'treasury.view' },
    ],
  },
  {
    label: 'Nomina',
    items: [
      { name: 'Empleados',     to: '/payroll/employees', icon: Users2,    permission: 'payroll.view' },
      { name: 'Liquidacion',   to: '/payroll/periods',   icon: Wallet,    permission: 'payroll.view' },
      { name: 'Configuracion', to: '/payroll/settings',  icon: Settings,  permission: 'payroll.view' },
    ],
  },
  {
    label: 'Impuestos',
    items: [
      { name: 'Conceptos',     to: '/taxes/concepts',     icon: BookMarked, permission: 'taxes.view' },
      { name: 'Retenciones',   to: '/taxes/withholding',  icon: Scale,      permission: 'taxes.view' },
      { name: 'Declaraciones', to: '/taxes/declarations', icon: ClipboardList, permission: 'taxes.view' },
      { name: 'Info Exogena',  to: '/taxes/exogenous',    icon: FileText,   permission: 'taxes.view' },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { name: 'Balance General', to: '/reports/balance-sheet', icon: BarChart3, permission: 'reports.view' },
      { name: 'Estado de Resultados', to: '/reports/income-statement', icon: PieChart, permission: 'reports.view' },
      { name: 'Balance de Prueba', to: '/reports/trial-balance', icon: BookMarked, permission: 'reports.view' },
    ],
  },
  {
    label: 'Administracion',
    items: [
      { name: 'Proveedores', to: '/suppliers', icon: Truck },
      { name: 'Ordenes de Compra', to: '/purchase-orders', icon: ShoppingBag },
      { name: 'Monedas', to: '/currencies', icon: DollarSign, adminOnly: true },
      { name: 'Usuarios', to: '/users', icon: UserCog, adminOnly: true },
      { name: 'Empresa', to: '/company', icon: Building2, permission: 'company.settings' },
    ],
  },
];

function NavGroup({ group, onNavigate }) {
  const [open, setOpen] = useState(true);
  const { can, isAdmin } = usePermission();

  const visibleItems = group.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.permission && !can(item.permission) && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;

  if (!group.label) {
    return (
      <div className="mb-1">
        {visibleItems.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <span>{group.label}</span>
        {open ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {open && (
        <div>
          {visibleItems.map((item) => (
            <NavItem key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={`w-4 h-4 flex-shrink-0 ${
              isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
            }`}
            strokeWidth={1.75}
          />
          <span className="truncate">{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    if (confirm('Confirmar cierre de sesion')) {
      logout();
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3" strokeLinecap="round" />
              <path d="M9 5a2 2 0 002-2h6a2 2 0 012 2v6a2 2 0 01-2 2h-2" strokeLinecap="round" />
              <path d="M12 12h3m-3 4h6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">ERP Colombia</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
              {user?.company?.nombre_comercial ?? 'Sistema Contable'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navigationGroups.map((group, i) => (
          <NavGroup key={i} group={group} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <NotificationBell />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
          <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 dark:text-primary-300 font-semibold text-xs">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
            title="Cerrar sesion"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LayoutNew({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 lg:bg-white dark:lg:bg-gray-800 lg:border-r lg:border-gray-200 dark:lg:border-gray-700">
        <SidebarContent onNavigate={undefined} />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth={2}>
              <path d="M9 7H6a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3" strokeLinecap="round" />
              <path d="M9 5a2 2 0 002-2h6a2 2 0 012 2v6a2 2 0 01-2 2h-2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">ERP Colombia</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-60 bg-white dark:bg-gray-800 shadow-xl animate-slide-in-left">
            <div className="absolute top-3 right-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:pl-60 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
