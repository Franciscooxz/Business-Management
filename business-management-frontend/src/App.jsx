import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';

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

// Módulo: Facturación Electrónica DIAN
const ElectronicInvoices = lazy(() => import('./pages/electronic-invoice/ElectronicInvoices'));
const InvoiceCreate      = lazy(() => import('./pages/electronic-invoice/InvoiceCreate'));
const InvoiceDetail      = lazy(() => import('./pages/electronic-invoice/InvoiceDetail'));

// Módulo: Contabilidad
const PucAccounts    = lazy(() => import('./pages/accounting/PucAccounts'));
const Vouchers       = lazy(() => import('./pages/accounting/Vouchers'));
const VoucherCreate  = lazy(() => import('./pages/accounting/VoucherCreate'));
const VoucherDetail  = lazy(() => import('./pages/accounting/VoucherDetail'));

// Módulo: Impuestos
const TaxConcepts        = lazy(() => import('./pages/taxes/TaxConcepts'));
const Declarations       = lazy(() => import('./pages/taxes/Declarations'));
const DeclarationDetail  = lazy(() => import('./pages/taxes/DeclarationDetail'));
const Withholding        = lazy(() => import('./pages/taxes/Withholding'));
const ExogenousInfo      = lazy(() => import('./pages/taxes/ExogenousInfo'));

// Módulo: Nómina
const Employees        = lazy(() => import('./pages/payroll/Employees'));
const PayrollPeriods   = lazy(() => import('./pages/payroll/PayrollPeriods'));
const PayrollDetail    = lazy(() => import('./pages/payroll/PayrollDetail'));
const PayrollSettings  = lazy(() => import('./pages/payroll/PayrollSettings'));

// Módulo: Reportes Financieros
const TrialBalance       = lazy(() => import('./pages/reports/TrialBalance'));
const BalanceSheet       = lazy(() => import('./pages/reports/BalanceSheet'));
const IncomeStatement    = lazy(() => import('./pages/reports/IncomeStatement'));
const GeneralLedger      = lazy(() => import('./pages/reports/GeneralLedger'));
const FinancialDashboard = lazy(() => import('./pages/reports/FinancialDashboard'));

// Módulo: Tesorería
const BankAccounts       = lazy(() => import('./pages/treasury/BankAccounts'));
const TreasuryMovements  = lazy(() => import('./pages/treasury/TreasuryMovements'));
const AccountsReceivable = lazy(() => import('./pages/treasury/AccountsReceivable'));
const AccountsPayable    = lazy(() => import('./pages/treasury/AccountsPayable'));
const CashFlow           = lazy(() => import('./pages/treasury/CashFlow'));

// Módulo: Administración / Auditoría
const AuditLog = lazy(() => import('./pages/AuditLog'));

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
      <ErrorBoundary fallbackMessage="La aplicación encontró un error. Por favor recarga la página.">
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

          {/* Facturación Electrónica DIAN */}
          <Route path="/electronic-invoice" element={<ProtectedRoute><ElectronicInvoices /></ProtectedRoute>} />
          <Route path="/electronic-invoice/create" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
          <Route path="/electronic-invoice/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />

          {/* Reportes Financieros */}
          <Route path="/reports/trial-balance"    element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
          <Route path="/reports/balance-sheet"    element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
          <Route path="/reports/income-statement" element={<ProtectedRoute><IncomeStatement /></ProtectedRoute>} />
          <Route path="/reports/general-ledger"   element={<ProtectedRoute><GeneralLedger /></ProtectedRoute>} />
          <Route path="/reports/financial-ratios" element={<ProtectedRoute><FinancialDashboard /></ProtectedRoute>} />

          {/* Impuestos */}
          <Route path="/taxes/concepts"              element={<ProtectedRoute><TaxConcepts /></ProtectedRoute>} />
          <Route path="/taxes/declarations"          element={<ProtectedRoute><Declarations /></ProtectedRoute>} />
          <Route path="/taxes/declarations/:id"      element={<ProtectedRoute><DeclarationDetail /></ProtectedRoute>} />
          <Route path="/taxes/withholding"           element={<ProtectedRoute><Withholding /></ProtectedRoute>} />
          <Route path="/taxes/exogenous"             element={<ProtectedRoute><ExogenousInfo /></ProtectedRoute>} />

          {/* Nómina */}
          <Route path="/payroll/employees"        element={<ProtectedRoute><Employees /></ProtectedRoute>} />
          <Route path="/payroll/periods"          element={<ProtectedRoute><PayrollPeriods /></ProtectedRoute>} />
          <Route path="/payroll/periods/:id"      element={<ProtectedRoute><PayrollDetail /></ProtectedRoute>} />
          <Route path="/payroll/settings"         element={<ProtectedRoute><PayrollSettings /></ProtectedRoute>} />

          {/* Tesorería */}
          <Route path="/treasury/accounts"    element={<ProtectedRoute><BankAccounts /></ProtectedRoute>} />
          <Route path="/treasury/movements"   element={<ProtectedRoute><TreasuryMovements /></ProtectedRoute>} />
          <Route path="/treasury/receivable"  element={<ProtectedRoute><AccountsReceivable /></ProtectedRoute>} />
          <Route path="/treasury/payable"     element={<ProtectedRoute><AccountsPayable /></ProtectedRoute>} />
          <Route path="/treasury/cash-flow"   element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />

          {/* Auditoría (solo admin) */}
          <Route path="/audit-log" element={<AdminRoute><AuditLog /></AdminRoute>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
