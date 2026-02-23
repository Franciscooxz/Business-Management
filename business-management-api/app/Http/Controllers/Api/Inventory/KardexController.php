<?php

namespace App\Http\Controllers\Api\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\Inventory\KardexService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KardexController extends Controller
{
    public function __construct(private KardexService $kardex) {}

    /**
     * GET /inventory/kardex/{productId}
     * Retorna la tarjeta Kardex completa de un producto.
     */
    public function show(Request $request, int $productId): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'type']);

        $kardex = $this->kardex->getKardex($productId, $filters);

        return response()->json([
            'data' => [
                'product' => [
                    'id'              => $kardex['product']->id,
                    'name'            => $kardex['product']->name,
                    'sku'             => $kardex['product']->sku,
                    'unit_of_measure' => $kardex['product']->unit_of_measure ?? 'UND',
                    'costing_method'  => $kardex['product']->costing_method,
                    'avg_cost'        => (float) $kardex['product']->avg_cost,
                    'stock'           => $kardex['product']->stock,
                    'inventory_value' => round($kardex['product']->stock * $kardex['product']->avg_cost, 2),
                    'category'        => $kardex['product']->category?->name,
                ],
                'costing_method'   => $kardex['costing_method'],
                'opening_qty'      => $kardex['opening_qty'],
                'opening_value'    => $kardex['opening_value'],
                'opening_avg_cost' => $kardex['opening_avg_cost'],
                'movements'        => $kardex['movements']->map(fn ($m) => $this->formatMovement($m)),
                'summary'          => $kardex['summary'],
            ],
        ]);
    }

    /**
     * GET /inventory/movements
     * Lista global de movimientos con filtros y paginación.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['product_id', 'type', 'date_from', 'date_to']);
        $perPage = (int) $request->get('per_page', 25);

        $paginator = $this->kardex->listMovements($filters, $perPage);

        return response()->json([
            'data' => collect($paginator->items())->map(fn ($m) => $this->formatMovement($m)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
        ]);
    }

    /**
     * POST /inventory/movements
     * Crea un movimiento manual de inventario (ajuste, entrada, salida).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'type'       => 'required|string|in:entrada,salida,ajuste,inicial',
            'quantity'   => 'required|integer|not_in:0',
            'unit_cost'  => 'nullable|numeric|min:0',
            'reason'     => 'nullable|string|max:255',
            'reference'  => 'nullable|string|max:100',
            'notes'      => 'nullable|string|max:1000',
        ]);

        try {
            $movement = $this->kardex->registerMovement([
                ...$validated,
                'user_id' => auth()->id(),
            ]);

            return response()->json([
                'message' => 'Movimiento registrado correctamente',
                'data'    => $this->formatMovement($movement),
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error interno al registrar movimiento'], 500);
        }
    }

    /**
     * GET /inventory/movements/types
     * Retorna los tipos de movimiento disponibles.
     */
    public function types(): JsonResponse
    {
        return response()->json([
            'data' => collect(StockMovement::TYPES)
                ->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
                ->values(),
        ]);
    }

    /**
     * GET /inventory/stock-alerts
     * Productos con stock bajo o agotado.
     */
    public function stockAlerts(): JsonResponse
    {
        $lowStock = Product::with('category')
            ->lowStock()
            ->select('id', 'name', 'sku', 'stock', 'min_stock', 'avg_cost', 'category_id')
            ->orderBy('stock')
            ->get();

        $outOfStock = Product::with('category')
            ->outOfStock()
            ->select('id', 'name', 'sku', 'stock', 'min_stock', 'avg_cost', 'category_id')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => [
                'low_stock'   => $lowStock,
                'out_of_stock'=> $outOfStock,
                'total_alerts'=> $lowStock->count() + $outOfStock->count(),
            ],
        ]);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private function formatMovement(StockMovement $m): array
    {
        return [
            'id'             => $m->id,
            'type'           => $m->type,
            'type_label'     => StockMovement::TYPES[$m->type] ?? $m->type,
            'quantity'       => $m->quantity,
            'previous_stock' => $m->previous_stock,
            'new_stock'      => $m->new_stock,
            'unit_cost'      => (float) $m->unit_cost,
            'total_cost'     => (float) $m->total_cost,
            'balance_qty'    => (float) $m->balance_qty,
            'balance_value'  => (float) $m->balance_value,
            'reason'         => $m->reason,
            'reference'      => $m->reference,
            'notes'          => $m->notes,
            'product'        => $m->relationLoaded('product') ? [
                'id'   => $m->product->id,
                'name' => $m->product->name,
                'sku'  => $m->product->sku,
            ] : null,
            'user' => $m->relationLoaded('user') ? [
                'id'   => $m->user->id,
                'name' => $m->user->name,
            ] : null,
            'created_at' => $m->created_at?->toISOString(),
        ];
    }
}
