<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Product;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\StockMovement;

class DashboardController extends Controller
{
    /**
     * OBTENER ESTADÍSTICAS DEL DASHBOARD
     * GET /api/dashboard
     */
    public function index(Request $request)
    {
        // ============================================
        // ESTADÍSTICAS DE USUARIOS
        // ============================================
        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        $inactiveUsers = User::where('is_active', false)->count();
        
        $adminRole = Role::where('name', 'admin')->first();
        $userRole = Role::where('name', 'user')->first();
        
        $totalAdmins = $adminRole ? User::where('role_id', $adminRole->id)->count() : 0;
        $totalRegularUsers = $userRole ? User::where('role_id', $userRole->id)->count() : 0;

        // ============================================
        // ESTADÍSTICAS DE PRODUCTOS
        // ============================================
        $totalProducts = Product::count();
        
        // Productos con stock bajo (menos de 10 unidades)
        $lowStockProducts = Product::where('stock', '>', 0)
                                   ->where('stock', '<', 10)
                                   ->count();
        
        // Productos sin stock
        $outOfStockProducts = Product::where('stock', 0)->count();
        
        // Valor total del inventario (precio * stock de cada producto)
        $totalInventoryValue = Product::selectRaw('SUM(price * stock) as total')
                                      ->value('total') ?? 0;

        // ============================================
        // ACTIVIDAD RECIENTE
        // ============================================
        
        // Últimos 5 usuarios registrados
        $latestUsers = User::with('role')
                          ->orderBy('created_at', 'desc')
                          ->take(5)
                          ->get()
                          ->map(function ($user) {
                              return [
                                  'id' => $user->id,
                                  'name' => $user->name,
                                  'email' => $user->email,
                                  'role' => $user->role->name,
                                  'created_at' => $user->created_at,
                              ];
                          });

        // Últimos 5 productos creados
        $latestProducts = Product::with('creator')
                                 ->orderBy('created_at', 'desc')
                                 ->take(5)
                                 ->get()
                                 ->map(function ($product) {
                                     return [
                                         'id' => $product->id,
                                         'name' => $product->name,
                                         'price' => $product->price,
                                         'stock' => $product->stock,
                                         'created_by' => $product->creator->name,
                                         'created_at' => $product->created_at,
                                     ];
                                 });

        // ============================================
        // TOP PRODUCTOS
        // ============================================
        
        // Productos más caros
        $mostExpensiveProducts = Product::orderBy('price', 'desc')
                                        ->take(5)
                                        ->get()
                                        ->map(function ($product) {
                                            return [
                                                'id' => $product->id,
                                                'name' => $product->name,
                                                'price' => $product->price,
                                                'stock' => $product->stock,
                                            ];
                                        });

        // Productos con más stock
        $highestStockProducts = Product::orderBy('stock', 'desc')
                                       ->take(5)
                                       ->get()
                                       ->map(function ($product) {
                                           return [
                                               'id' => $product->id,
                                               'name' => $product->name,
                                               'price' => $product->price,
                                               'stock' => $product->stock,
                                           ];
                                       });

        // ============================================
        // ALERTAS
        // ============================================
        $alerts = [];

        if ($outOfStockProducts > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "{$outOfStockProducts} producto(s) sin stock",
                'action' => 'Revisar inventario',
            ];
        }

        if ($lowStockProducts > 0) {
            $alerts[] = [
                'type' => 'info',
                'message' => "{$lowStockProducts} producto(s) con stock bajo",
                'action' => 'Reabastecer pronto',
            ];
        }

        if ($inactiveUsers > 0) {
            $alerts[] = [
                'type' => 'info',
                'message' => "{$inactiveUsers} usuario(s) inactivo(s)",
                'action' => 'Revisar cuentas',
            ];
        }

        // Movimientos de stock recientes
        $recentMovements = StockMovement::with(['product:id,name', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'product' => $movement->product->name,
                    'user' => $movement->user->name,
                    'type' => $movement->type,
                    'quantity' => $movement->quantity,
                    'created_at' => $movement->created_at,
                ];
            });

        // Productos más movidos (mayor actividad)
        $mostActiveProducts = StockMovement::select('product_id')
            ->selectRaw('COUNT(*) as movements_count')
            ->groupBy('product_id')
            ->orderBy('movements_count', 'desc')
            ->take(5)
            ->with('product:id,name,stock')
            ->get()
            ->map(function ($item) {
                return [
                    'product' => $item->product->name,
                    'stock' => $item->product->stock,
                    'movements' => $item->movements_count,
                ];
            });

        // ============================================
        // RESPUESTA
        // ============================================
        return response()->json([
            'success' => true,
            'data' => [
                'users' => [
                    'total' => $totalUsers,
                    'active' => $activeUsers,
                    'inactive' => $inactiveUsers,
                    'admins' => $totalAdmins,
                    'regular_users' => $totalRegularUsers,
                ],
                'products' => [
                    'total' => $totalProducts,
                    'low_stock' => $lowStockProducts,
                    'out_of_stock' => $outOfStockProducts,
                    'total_inventory_value' => number_format($totalInventoryValue, 2, '.', ''),
                ],
                'recent_activity' => [
                    'latest_users' => $latestUsers,
                    'latest_products' => $latestProducts,
                    'recent_movements' => $recentMovements,
                ],
                'top_products' => [
                    'most_expensive' => $mostExpensiveProducts,
                    'highest_stock' => $highestStockProducts,
                    'most_active' => $mostActiveProducts,
                ],
                'alerts' => $alerts,
            ],
        ], 200);
        
    }

    /**
     * ESTADÍSTICAS POR RANGO DE FECHAS
     * GET /api/dashboard/stats?start_date=2026-01-01&end_date=2026-01-31
     */
    public function stats(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $request->start_date ?? now()->startOfMonth();
        $endDate = $request->end_date ?? now()->endOfMonth();

        // Usuarios registrados en el período
        $usersInPeriod = User::whereBetween('created_at', [$startDate, $endDate])
                            ->count();

        // Productos creados en el período
        $productsInPeriod = Product::whereBetween('created_at', [$startDate, $endDate])
                                   ->count();

        // Valor de productos creados en el período
        $productsValueInPeriod = Product::whereBetween('created_at', [$startDate, $endDate])
                                        ->selectRaw('SUM(price * stock) as total')
                                        ->value('total') ?? 0;

        return response()->json([
            'success' => true,
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'data' => [
                'users_registered' => $usersInPeriod,
                'products_created' => $productsInPeriod,
                'products_value_added' => number_format($productsValueInPeriod, 2, '.', ''),
            ],
        ], 200);
    }

    public function statistics()
    {
        // Users stats
        $usersTotal = \App\Models\User::count();
        $usersActive = \App\Models\User::where('is_active', true)->count();

        // Products stats
        $productsTotal = \App\Models\Product::count();
        $productsLowStock = \App\Models\Product::where('stock', '<=', 5)->count();
        $productsLowStockItems = \App\Models\Product::with('category')
            ->where('stock', '<=', 5)
            ->orderBy('stock', 'asc')
            ->limit(10)
            ->get();

        // Categories stats
        $categoriesTotal = \App\Models\Category::count();
        $categoriesActive = \App\Models\Category::where('is_active', true)->count();

        // Customers stats
        $customersTotal = \App\Models\Customer::count();

        // Sales stats
        $salesToday = \App\Models\Sale::whereDate('created_at', today())->where('status', 'completada')->count();
        $revenueToday = \App\Models\Sale::whereDate('created_at', today())->where('status', 'completada')->sum('total');

        return response()->json([
            'success' => true,
            'data' => [
                'users' => [
                    'total' => $usersTotal,
                    'active' => $usersActive,
                ],
                'products' => [
                    'total' => $productsTotal,
                    'low_stock' => $productsLowStock,
                    'low_stock_items' => $productsLowStockItems,
                ],
                'categories' => [
                    'total' => $categoriesTotal,
                    'active' => $categoriesActive,
                ],
                'customers' => [
                    'total' => $customersTotal,
                ],
                'sales' => [
                    'today' => $salesToday,
                    'revenue_today' => number_format($revenueToday, 2, '.', ''),
                ],
            ],
        ]);
    }

}