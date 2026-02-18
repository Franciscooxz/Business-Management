<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\StockService;
use App\Exports\ProductsExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    protected $stockService;

    public function __construct(StockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function index(Request $request)
    {
        $query = Product::with(['creator', 'category']);

        // FILTRO POR CATEGORÍA
        if ($request->has('category_id') && $request->category_id != '') {
            $query->where('category_id', $request->category_id);
        }

        // BÚSQUEDA POR TEXTO
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // FILTRO POR PRECIO MÍNIMO
        if ($request->has('min_price') && $request->min_price != '') {
            $query->where('price', '>=', $request->min_price);
        }

        // FILTRO POR PRECIO MÁXIMO
        if ($request->has('max_price') && $request->max_price != '') {
            $query->where('price', '<=', $request->max_price);
        }

        // FILTRO POR STOCK MÍNIMO
        if ($request->has('stock_min') && $request->stock_min != '') {
            $query->where('stock', '>=', $request->stock_min);
        }

        // FILTRO POR STOCK MÁXIMO
        if ($request->has('stock_max') && $request->stock_max != '') {
            $query->where('stock', '<=', $request->stock_max);
        }

        // ORDENAMIENTO
        $orderBy = $request->get('order_by', 'created_at');
        $order = $request->get('order', 'desc');

        $allowedOrderBy = ['name', 'price', 'stock', 'created_at'];
        if (!in_array($orderBy, $allowedOrderBy)) {
            $orderBy = 'created_at';
        }

        $order = strtolower($order);
        if (!in_array($order, ['asc', 'desc'])) {
            $order = 'desc';
        }

        $query->orderBy($orderBy, $order);

        // PAGINACIÓN
        $perPage = $request->get('per_page', 10);
        $perPage = min(max((int)$perPage, 1), 100);

        $products = $query->paginate($perPage);

        return ProductResource::collection($products)->additional([
            'success' => true,
            'filters_applied' => [
                'search' => $request->search ?? null,
                'category_id' => $request->category_id ?? null,
                'min_price' => $request->min_price ?? null,
                'max_price' => $request->max_price ?? null,
                'stock_min' => $request->stock_min ?? null,
                'stock_max' => $request->stock_max ?? null,
                'order_by' => $orderBy,
                'order' => $order,
            ],
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        // Preparar datos
        $productData = [
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $request->stock,
            'created_by' => auth()->id(),
        ];

        // Manejar category_id
        if ($request->category_id && $request->category_id !== '') {
            $productData['category_id'] = (int)$request->category_id;
        } else {
            $productData['category_id'] = null;
        }

        $product = Product::create($productData);

        // Registrar movimiento inicial de stock si existe
        if ($product->stock > 0 && isset($this->stockService)) {
            $this->stockService->registerMovement(
                $product->id,
                auth()->id(),
                'inicial',
                $product->stock,
                'Stock inicial al crear producto'
            );
        }

        $product->load(['creator', 'category']);

        return (new ProductResource($product))->additional([
            'success' => true,
            'message' => 'Product created successfully',
        ])->response()->setStatusCode(201);
    }

    public function update(UpdateProductRequest $request, string $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }

        // Detectar cambio de stock
        $oldStock = $product->stock;
        $newStock = $request->has('stock') ? (int)$request->stock : $oldStock;
        
        // Preparar datos para actualizar
        $updateData = [
            'name' => $request->name ?? $product->name,
            'description' => $request->description ?? $product->description,
            'price' => $request->price ?? $product->price,
            'stock' => (int)$request->stock,
        ];

        // Manejar category_id correctamente
        if ($request->has('category_id')) {
            // Si viene vacío o null, establecer como null
            $updateData['category_id'] = $request->category_id && $request->category_id !== '' 
                ? (int)$request->category_id 
                : null;
        } else {
            // Si no viene en la request, mantener el actual
            $updateData['category_id'] = $product->category_id;
        }
        
        // Actualizar producto
        $product->update($updateData);
        
        // Registrar movimiento de stock si cambió
        if ($newStock !== $oldStock && isset($this->stockService)) {
            $difference = $newStock - $oldStock;
            
            $this->stockService->registerMovement(
                $product->id,
                auth()->id(),
                'ajuste',
                $difference,
                'Ajuste manual desde edición de producto'
            );
        }
        
        $product->load(['creator', 'category']);

        return (new ProductResource($product))->additional([
            'success' => true,
            'message' => 'Product updated successfully',
        ]);
    }

    public function destroy(string $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found',
            ], 404);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully',
        ], 200);
    }

    // SOFT DELETES
    public function trashed()
    {
        $products = Product::onlyTrashed()->with('creator')->get();

        return ProductResource::collection($products)->additional([
            'success' => true,
        ]);
    }

    public function restore(string $id)
    {
        $product = Product::onlyTrashed()->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found in trash',
            ], 404);
        }

        $product->restore();

        return response()->json([
            'success' => true,
            'message' => 'Product restored successfully',
            'data' => new ProductResource($product),
        ], 200);
    }

    public function forceDelete(string $id)
    {
        $product = Product::onlyTrashed()->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found in trash',
            ], 404);
        }

        $product->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Product permanently deleted',
        ], 200);
    }

    /**
     * EXPORTAR PRODUCTOS A EXCEL
     * GET /api/products/export
     */
    public function export(Request $request)
    {
        try {
            $filters = [
                'search' => $request->search,
                'category_id' => $request->category_id,
            ];

            $filename = 'productos_' . date('Y-m-d_His') . '.xlsx';

            return Excel::download(new ProductsExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}