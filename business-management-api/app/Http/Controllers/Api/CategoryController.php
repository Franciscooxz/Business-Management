<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * LISTAR CATEGORÍAS
     * GET /api/categories
     */
    public function index(Request $request)
    {
        $query = Category::withCount('products'); // Contar productos por categoría

        // Filtro por estado
        if ($request->has('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        // Búsqueda
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Ordenamiento
        $orderBy = $request->get('order_by', 'name');
        $order = $request->get('order', 'asc');

        $allowedOrderBy = ['name', 'created_at', 'products_count'];
        if (!in_array($orderBy, $allowedOrderBy)) {
            $orderBy = 'name';
        }

        $order = strtolower($order);
        if (!in_array($order, ['asc', 'desc'])) {
            $order = 'asc';
        }

        if ($orderBy === 'products_count') {
            $query->orderBy('products_count', $order);
        } else {
            $query->orderBy($orderBy, $order);
        }

        // Paginación
        $perPage = $request->get('per_page', 20);
        $perPage = min(max((int)$perPage, 1), 100);

        $categories = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'pagination' => [
                'current_page' => $categories->currentPage(),
                'last_page' => $categories->lastPage(),
                'per_page' => $categories->perPage(),
                'total' => $categories->total(),
            ],
            'data' => $categories->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => $category->description,
                    'is_active' => $category->is_active,
                    'products_count' => $category->products_count,
                    'created_at' => $category->created_at,
                ];
            }),
        ], 200);
    }

    /**
     * CREAR CATEGORÍA (Solo Admin)
     * POST /api/categories
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100|unique:categories',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
        ]);

        $category = Category::create([
            'name' => $request->name,
            'description' => $request->description,
            'is_active' => $request->is_active ?? true,
            // slug se genera automáticamente en el modelo
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Category created successfully',
            'data' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'is_active' => $category->is_active,
            ],
        ], 201);
    }

    /**
     * VER CATEGORÍA CON SUS PRODUCTOS
     * GET /api/categories/{id}
     */
    public function show(string $id)
    {
        $category = Category::with(['products' => function($query) {
            $query->with('creator')->take(10); // Solo 10 productos como ejemplo
        }])->find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'is_active' => $category->is_active,
                'products_count' => $category->products->count(),
                'products' => $category->products->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'price' => $product->price,
                        'stock' => $product->stock,
                    ];
                }),
                'created_at' => $category->created_at,
            ],
        ], 200);
    }

    /**
     * ACTUALIZAR CATEGORÍA (Solo Admin)
     * PUT /api/categories/{id}
     */
    public function update(Request $request, string $id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('categories')->ignore($category->id),
            ],
            'description' => 'sometimes|nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
        ]);

        $category->update($request->only(['name', 'description', 'is_active']));

        return response()->json([
            'success' => true,
            'message' => 'Category updated successfully',
            'data' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'is_active' => $category->is_active,
            ],
        ], 200);
    }

    /**
     * ELIMINAR CATEGORÍA (Solo Admin)
     * DELETE /api/categories/{id}
     */
    public function destroy(string $id)
    {
        $category = Category::find($id);

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Category not found',
            ], 404);
        }

        // Verificar si tiene productos asignados
        if ($category->products()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete category with assigned products',
                'products_count' => $category->products()->count(),
            ], 409); // Conflict
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Category deleted successfully',
        ], 200);
    }
}