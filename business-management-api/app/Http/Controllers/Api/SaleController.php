<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService = null)
    {
        $this->stockService = $stockService;
    }

    /**
     * Listar ventas con filtros
     */
    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'user', 'items.product']);

        // Filtro por estado
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro por método de pago
        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filtro por cliente
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filtro por fecha
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Búsqueda por nombre de cliente
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_email', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Ordenar
        $query->orderBy('created_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $sales = $query->paginate($perPage);

        return SaleResource::collection($sales)->additional([
            'success' => true,
            'message' => 'Sales retrieved successfully',
        ]);
    }

    /**
     * Crear nueva venta
     */
    public function store(StoreSaleRequest $request)
    {
        return DB::transaction(function () use ($request) {
            // Validar stock de todos los productos
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                
                if ($product->stock < $item['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => "Stock insuficiente para {$product->name}. Disponible: {$product->stock}",
                    ], 400);
                }
            }

            // Crear la venta
            $sale = Sale::create([
                'customer_id' => $request->customer_id,
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'user_id' => auth()->id(),
                'subtotal' => $request->subtotal,
                'tax' => $request->tax ?? 0,
                'discount' => $request->discount ?? 0,
                'total' => $request->total,
                'payment_method' => $request->payment_method,
                'status' => $request->status ?? 'completada',
                'notes' => $request->notes,
            ]);

            // Crear items y descontar stock
            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Crear item de venta
                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['quantity'] * $item['price'],
                ]);

                // Descontar stock
                $product->decrement('stock', $item['quantity']);

                // Registrar movimiento de stock
                if ($this->stockService) {
                    $this->stockService->registerMovement(
                        $product->id,
                        auth()->id(),
                        'salida',
                        -$item['quantity'],
                        "Venta #{$sale->id}"
                    );
                }
            }

            $sale->load(['customer', 'user', 'items.product']);

            return (new SaleResource($sale))->additional([
                'success' => true,
                'message' => 'Sale created successfully',
            ])->response()->setStatusCode(201);
        });
    }

    /**
     * Mostrar una venta específica
     */
    public function show(string $id)
    {
        $sale = Sale::with(['customer', 'user', 'items.product'])->findOrFail($id);

        return (new SaleResource($sale))->additional([
            'success' => true,
            'message' => 'Sale retrieved successfully',
        ]);
    }

    /**
     * Cancelar una venta (devuelve stock)
     */
    public function cancel(string $id)
    {
        return DB::transaction(function () use ($id) {
            $sale = Sale::with('items')->findOrFail($id);

            if ($sale->status === 'cancelada') {
                return response()->json([
                    'success' => false,
                    'message' => 'Sale is already cancelled',
                ], 400);
            }

            // Devolver stock
            foreach ($sale->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);

                    // Registrar movimiento
                    if ($this->stockService) {
                        $this->stockService->registerMovement(
                            $product->id,
                            auth()->id(),
                            'entrada',
                            $item->quantity,
                            "Cancelación de venta #{$sale->id}"
                        );
                    }
                }
            }

            // Actualizar estado
            $sale->update(['status' => 'cancelada']);
            $sale->load(['customer', 'user', 'items.product']);

            return (new SaleResource($sale))->additional([
                'success' => true,
                'message' => 'Sale cancelled successfully',
            ]);
        });
    }

    /**
     * Estadísticas de ventas
     */
    public function statistics(Request $request)
    {
        $period = $request->get('period', 'today'); // today, week, month, year

        $query = Sale::where('status', 'completada');

        switch ($period) {
            case 'today':
                $query->today();
                break;
            case 'week':
                $query->thisWeek();
                break;
            case 'month':
                $query->thisMonth();
                break;
            case 'year':
                $query->whereYear('created_at', now()->year);
                break;
        }

        $totalSales = $query->count();
        $totalRevenue = $query->sum('total');
        $averageTicket = $totalSales > 0 ? $totalRevenue / $totalSales : 0;

        // Productos más vendidos
        $topProducts = SaleItem::select('product_id', 'product_name', DB::raw('SUM(quantity) as total_quantity'))
            ->whereHas('sale', function ($q) use ($query) {
                $q->where('status', 'completada')
                  ->whereBetween('created_at', [$query->min('created_at'), $query->max('created_at')]);
            })
            ->groupBy('product_id', 'product_name')
            ->orderBy('total_quantity', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_sales' => $totalSales,
                'total_revenue' => number_format($totalRevenue, 2, '.', ''),
                'average_ticket' => number_format($averageTicket, 2, '.', ''),
                'top_products' => $topProducts,
            ],
        ]);
    }

    /**
     * Eliminar venta (solo si está cancelada)
     */
    public function destroy(string $id)
    {
        $sale = Sale::findOrFail($id);

        if ($sale->status !== 'cancelada') {
            return response()->json([
                'success' => false,
                'message' => 'Only cancelled sales can be deleted',
            ], 400);
        }

        $sale->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sale deleted successfully',
        ]);
    }
}