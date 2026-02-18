<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Product;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService = null)
    {
        $this->stockService = $stockService;
    }

    /**
     * Listar órdenes de compra
     */
    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'user', 'currency', 'items.product']);

        // Filtro por proveedor
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Filtro por estado
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro por fechas
        if ($request->has('date_from')) {
            $query->whereDate('order_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('order_date', '<=', $request->date_to);
        }

        // Ordenar
        $query->orderBy('order_date', 'desc');

        $perPage = $request->get('per_page', 15);
        $orders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'from' => $orders->firstItem(),
                'to' => $orders->lastItem(),
            ],
        ]);
    }

    /**
     * Crear orden de compra
     */
    public function store(StorePurchaseOrderRequest $request)
    {
        return DB::transaction(function () use ($request) {
            // Crear orden
            $order = PurchaseOrder::create([
                'supplier_id' => $request->supplier_id,
                'user_id' => auth()->id(),
                'currency_id' => $request->currency_id,
                'order_date' => $request->order_date,
                'expected_delivery_date' => $request->expected_delivery_date,
                'subtotal' => $request->subtotal,
                'tax' => $request->tax ?? 0,
                'shipping' => $request->shipping ?? 0,
                'total' => $request->total,
                'status' => 'pending',
                'notes' => $request->notes,
            ]);

            // Crear items
            foreach ($request->items as $item) {
                PurchaseOrderItem::create([
                    'purchase_order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'],
                    'subtotal' => $item['quantity_ordered'] * $item['unit_cost'],
                ]);
            }

            $order->load(['supplier', 'user', 'currency', 'items.product']);

            return response()->json([
                'success' => true,
                'message' => 'Purchase order created successfully',
                'data' => $order,
            ], 201);
        });
    }

    /**
     * Mostrar orden de compra
     */
    public function show(string $id)
    {
        $order = PurchaseOrder::with(['supplier', 'user', 'currency', 'items.product'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Recibir mercancía (total o parcial)
     */
    public function receive(Request $request, string $id)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:purchase_order_items,id',
            'items.*.quantity_received' => 'required|integer|min:1',
            'received_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($request, $id) {
            $order = PurchaseOrder::with('items')->findOrFail($id);

            if ($order->status === 'cancelled') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot receive cancelled purchase order',
                ], 400);
            }

            foreach ($request->items as $itemData) {
                $item = PurchaseOrderItem::findOrFail($itemData['item_id']);
                
                // Validar que no se reciba más de lo ordenado
                $newReceived = $item->quantity_received + $itemData['quantity_received'];
                if ($newReceived > $item->quantity_ordered) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cannot receive more than ordered for product: {$item->product->name}",
                    ], 400);
                }

                // Actualizar cantidad recibida
                $item->update([
                    'quantity_received' => $newReceived
                ]);

                // Actualizar stock del producto
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increment('stock', $itemData['quantity_received']);

                    // Registrar movimiento de stock
                    if ($this->stockService) {
                        $this->stockService->registerMovement(
                            $product->id,
                            auth()->id(),
                            'entrada',
                            $itemData['quantity_received'],
                            "Recepción de orden de compra #{$order->order_number}"
                        );
                    }
                }
            }

            // Actualizar estado de la orden
            $order->refresh();
            if ($order->isFullyReceived()) {
                $order->update([
                    'status' => 'received',
                    'received_date' => $request->received_date ?? now(),
                ]);
            } else {
                $order->update(['status' => 'partial']);
            }

            $order->load(['supplier', 'user', 'currency', 'items.product']);

            return response()->json([
                'success' => true,
                'message' => 'Purchase order received successfully',
                'data' => $order,
            ]);
        });
    }

    /**
     * Cancelar orden de compra
     */
    public function cancel(string $id)
    {
        $order = PurchaseOrder::findOrFail($id);

        if ($order->status === 'received') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel received purchase order',
            ], 400);
        }

        $order->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'message' => 'Purchase order cancelled successfully',
            'data' => $order,
        ]);
    }

    /**
     * Eliminar orden de compra
     */
    public function destroy(string $id)
    {
        $order = PurchaseOrder::findOrFail($id);

        if ($order->status === 'received' || $order->status === 'partial') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete received or partial purchase orders',
            ], 400);
        }

        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Purchase order deleted successfully',
        ]);
    }
}