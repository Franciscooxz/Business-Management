import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Users from './pages/Users';
import POS from './pages/POS';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import CurrenciesPage from './pages/Currencies';
import PurchaseOrdersPage from './pages/PurchaseOrders';
import SuppliersPage from './pages/Suppliers';
import ReportsPage from './pages/Reports';
import NotFound from './pages/NotFound';

// Protected Route Component
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
}

// Admin Only Route
function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  
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
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/pos" element={
          <ProtectedRoute>
            <POS />
          </ProtectedRoute>
        } />

        <Route path="/sales" element={
          <ProtectedRoute>
            <Sales />
          </ProtectedRoute>
        } />

        <Route path="/customers" element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        } />
        
        <Route path="/products" element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } />
        
        <Route path="/categories" element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        } />

        {/* Admin Only Routes */}
        <Route path="/users" element={
          <AdminRoute>
            <Users />
          </AdminRoute>
        } />

        {/* Currents */}
        <Route path="/currencies" element={
          <AdminRoute>
            <CurrenciesPage />
          </AdminRoute>
        } />

        {/* Suppliers & Purchase Orders */}
        <Route path="/suppliers" element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        } />

        <Route path="/purchase-orders" element={
          <ProtectedRoute>
            <PurchaseOrdersPage />
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;