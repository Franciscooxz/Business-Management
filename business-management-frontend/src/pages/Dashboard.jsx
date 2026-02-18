import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign, 
  ShoppingCart,
  AlertCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import api from '../api/axios';
import LayoutNew from '../components/layout/LayoutNew';
import { useStockAlerts } from '../hooks/useStockAlerts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
  });
  
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesGrowth, setSalesGrowth] = useState(0);

  // Hook para alertas de stock
  useStockAlerts();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch en paralelo para mejor performance
      const [
        productsRes,
        customersRes,
        salesRes,
      ] = await Promise.all([
        api.get('/products', { params: { per_page: 1000 } }),
        api.get('/customers', { params: { per_page: 1000 } }),
        api.get('/sales', { params: { per_page: 100 } }),
      ]);

      const products = productsRes.data.data;
      const customers = customersRes.data.data;
      const sales = salesRes.data.data;

      // Calcular estadísticas
      const totalSales = sales.reduce((sum, sale) => {
        if (sale.status === 'completada') {
          return sum + parseFloat(sale.total);
        }
        return sum;
      }, 0);

      const lowStock = products.filter(p => p.stock <= (p.min_stock || 5)).length;

      // Calcular crecimiento de ventas (últimos 30 días vs 30 anteriores)
      const now = new Date();
      const last30Days = new Date(now.setDate(now.getDate() - 30));
      const last60Days = new Date(now.setDate(now.getDate() - 30));

      const salesLast30 = sales.filter(s => new Date(s.created_at) >= last30Days && s.status === 'completada');
      const salesPrevious30 = sales.filter(s => {
        const date = new Date(s.created_at);
        return date >= last60Days && date < last30Days && s.status === 'completada';
      });

      const totalLast30 = salesLast30.reduce((sum, s) => sum + parseFloat(s.total), 0);
      const totalPrevious30 = salesPrevious30.reduce((sum, s) => sum + parseFloat(s.total), 0);
      
      const growth = totalPrevious30 > 0 
        ? ((totalLast30 - totalPrevious30) / totalPrevious30) * 100 
        : 0;

      setStats({
        totalSales,
        totalProducts: products.length,
        totalCustomers: customers.length,
        lowStockProducts: lowStock,
      });

      setSalesGrowth(growth);

      // Ventas de los últimos 7 días
      const last7Days = getLast7Days();
      const salesByDay = last7Days.map(date => {
        const daySales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at).toLocaleDateString('es-ES');
          return saleDate === date && sale.status === 'completada';
        });
        
        const total = daySales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
        
        return {
          date: formatDate(date),
          ventas: parseFloat(total.toFixed(2)),
          cantidad: daySales.length,
        };
      });
      setSalesData(salesByDay);

      // Top 5 productos más vendidos
      const productSales = {};
      sales.forEach(sale => {
        if (sale.status === 'completada' && sale.items) {
          sale.items.forEach(item => {
            const productName = item.product?.name || 'Producto';
            if (!productSales[productName]) {
              productSales[productName] = 0;
            }
            productSales[productName] += item.quantity;
          });
        }
      });

      const topProductsArray = Object.entries(productSales)
        .map(([name, quantity]) => ({ name, cantidad: quantity }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      setTopProducts(topProductsArray);

      // Métodos de pago
      const paymentStats = sales
        .filter(s => s.status === 'completada')
        .reduce((acc, sale) => {
          const method = sale.payment_method;
          if (!acc[method]) {
            acc[method] = { name: getPaymentLabel(method), value: 0, count: 0 };
          }
          acc[method].value += parseFloat(sale.total);
          acc[method].count += 1;
          return acc;
        }, {});

      setPaymentMethods(Object.values(paymentStats));

      // Ventas recientes
      const recent = sales
        .filter(s => s.status === 'completada')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
      
      setRecentSales(recent);

    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('es-ES'));
    }
    return days;
  };

  const formatDate = (dateString) => {
    const [day, month] = dateString.split('/');
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day} ${monthNames[parseInt(month) - 1]}`;
  };

  const getPaymentLabel = (method) => {
    const labels = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <LayoutNew>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
          </div>
        </div>
      </LayoutNew>
    );
  }

  return (
    <LayoutNew>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general de tu negocio</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Ventas */}
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 dark:bg-blue-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              {salesGrowth !== 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  salesGrowth > 0 
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {salesGrowth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(salesGrowth).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
              Total Ventas
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              ${stats.totalSales.toFixed(2)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Últimos 30 días
            </p>
          </div>

          {/* Total Productos */}
          <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-1">
              Total Productos
            </p>
            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {stats.totalProducts}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              En catálogo
            </p>
          </div>

          {/* Total Clientes */}
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500 dark:bg-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-1">
              Total Clientes
            </p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {stats.totalCustomers}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
              Registrados
            </p>
          </div>

          {/* Stock Bajo */}
          <div className="card bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-500 dark:bg-amber-600 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">
              Stock Bajo
            </p>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {stats.lowStockProducts}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Requieren atención
            </p>
          </div>
        </div>

        {/* Gráfica de Ventas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Ventas Últimos 7 Días
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`$${value}`, 'Ventas']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ventas" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Grid de gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Productos */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Top 5 Productos
              </h2>
            </div>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="cantidad" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No hay datos de ventas</p>
              </div>
            )}
          </div>

          {/* Métodos de Pago */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Métodos de Pago
              </h2>
            </div>
            {paymentMethods.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `$${parseFloat(value).toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No hay datos de pagos</p>
              </div>
            )}
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Ventas Recientes
          </h2>
          {recentSales.length > 0 ? (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div 
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                        #{sale.id}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {sale.customer_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">
                      ${parseFloat(sale.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {sale.payment_method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No hay ventas recientes</p>
            </div>
          )}
        </div>
      </div>
    </LayoutNew>
  );
}