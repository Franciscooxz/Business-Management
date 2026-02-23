import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Auth (no lazy — siempre necesario)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Core pages (eager — se usan siempre al entrar)
import Dashboard from './pages/Dashboard';

// Módulo: Inventario/Productos
const Products   = lazy(() => import('./pages/Products'));
const Categories = lazy(() => import('./pages/Categories'));
const Kardex     = lazy(() => import('./pages/inventory/Kardex'));

// Módulo: Comercial
const POS = lazy(() => import('./pages/POS'));
const Sales = lazy(() => import('./pages/Sales'));
const Customers = lazy(() => import('./pages/Customers'));

// Módulo: Administración
const Users = lazy(() => import('./pages/Users'));
const CurrenciesPage = lazy(() => import('./pages/Currencies'));
const SuppliersPage = lazy(() => import('./pages/Suppliers'));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrders'));
const ReportsPage = lazy(() => import('./pages/Reports'));

// Módulo: Terceros
const ThirdParties = lazy(() => import('./pages/third-parties/ThirdParties'));

// Módulo: Contabilidad
const PucAccounts    = lazy(() => import('./pages/accounting/PucAccounts'));
const Vouchers       = lazy(() => import('./pages/accounting/Vouchers'));
const VoucherCreate  = lazy(() => import('./pages/accounting/VoucherCreate'));
const VoucherDetail  = lazy(() => import('./pages/accounting/VoucherDetail'));

const NotFound = lazy(() => import('./pages/NotFound'));

// Spinner de carga entre módulos
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin' && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#363636',
            fontSize: '14px',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Comercial */}
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />

          {/* Terceros */}
          <Route path="/third-parties" element={<ProtectedRoute><ThirdParties /></ProtectedRoute>} />

          {/* Contabilidad */}
          <Route path="/accounting/puc" element={<ProtectedRoute><PucAccounts /></ProtectedRoute>} />
          <Route path="/accounting/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
          <Route path="/accounting/vouchers/create" element={<ProtectedRoute><VoucherCreate /></ProtectedRoute>} />
          <Route path="/accounting/vouchers/:id" element={<ProtectedRoute><VoucherDetail /></ProtectedRoute>} />

          {/* Inventario */}
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/inventory/kardex" element={<ProtectedRoute><Kardex /></ProtectedRoute>} />

          {/* Administración */}
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/currencies" element={<AdminRoute><CurrenciesPage /></AdminRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
          <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
