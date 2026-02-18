<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\Request;
use App\Exports\StockMovementsExport;
use Maatwebsite\Excel\Facades\Excel;

class StockMovementController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    /**
     * Obtener historial de un producto
     * GET /api/products/{id}/stock-movements
     */
    public function getProductMovements(string $productId)
    {
        try {
            $movements = $this->stockService->getProductHistory($productId);

            return response()->json([
                'success' => true,
                'data' => $movements->map(function ($movement) {
                    return [
                        'id' => $movement->id,
                        'type' => $movement->type,
                        'quantity' => $movement->quantity,
                        'previous_stock' => $movement->previous_stock,
                        'new_stock' => $movement->new_stock,
                        'reason' => $movement->reason,
                        'user' => [
                            'id' => $movement->user->id,
                            'name' => $movement->user->name,
                        ],
                        'created_at' => $movement->created_at,
                    ];
                }),
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener historial',
            ], 500);
        }
    }

    /**
     * Crear movimiento manual de stock
     * POST /api/products/{id}/stock-movements
     */
    public function createMovement(Request $request, string $productId)
    {
        $request->validate([
            'type' => 'required|in:entrada,salida,ajuste',
            'quantity' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        try {
            $movement = $this->stockService->registerMovement(
                $productId,
                auth()->id(),
                $request->type,
                $request->quantity,
                $request->reason
            );

            return response()->json([
                'success' => true,
                'message' => 'Movimiento registrado correctamente',
                'data' => $movement,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar movimiento',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtener todos los movimientos (con filtros)
     * GET /api/stock-movements
     */
    public function index(Request $request)
    {
        $query = StockMovement::with(['product:id,name', 'user:id,name']);

        // Filtro por tipo
        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        // Filtro por producto
        if ($request->has('product_id') && $request->product_id) {
            $query->where('product_id', $request->product_id);
        }

        // Filtro por rango de fechas
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Ordenar
        $query->orderBy('created_at', 'desc');

        // Paginar
        $perPage = $request->get('per_page', 20);
        $movements = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $movements->map(function ($movement) {
                return [
                    'id' => $movement->id,
                    'product' => [
                        'id' => $movement->product->id,
                        'name' => $movement->product->name,
                    ],
                    'user' => [
                        'id' => $movement->user->id,
                        'name' => $movement->user->name,
                    ],
                    'type' => $movement->type,
                    'quantity' => $movement->quantity,
                    'previous_stock' => $movement->previous_stock,
                    'new_stock' => $movement->new_stock,
                    'reason' => $movement->reason,
                    'created_at' => $movement->created_at,
                ];
            }),
            'pagination' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        ], 200);
    }

    public function export(Request $request)
    {
        try {
            $filters = [
                'product_id' => $request->product_id,
                'type' => $request->type,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
            ];

            $filename = 'movimientos_stock_' . date('Y-m-d_His') . '.xlsx';

            return Excel::download(new StockMovementsExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

}