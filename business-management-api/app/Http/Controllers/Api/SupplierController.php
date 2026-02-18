<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Listar proveedores
     */
    public function index(Request $request)
    {
        $query = Supplier::with('creator');

        // Búsqueda
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filtro por estado
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true');
        }

        // Ordenar
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $suppliers = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $suppliers->items(),
            'meta' => [
                'current_page' => $suppliers->currentPage(),
                'last_page' => $suppliers->lastPage(),
                'per_page' => $suppliers->perPage(),
                'total' => $suppliers->total(),
                'from' => $suppliers->firstItem(),
                'to' => $suppliers->lastItem(),
            ],
        ]);
    }

    /**
     * Crear proveedor
     */
    public function store(StoreSupplierRequest $request)
    {
        $supplier = Supplier::create([
            'name' => $request->name,
            'company_name' => $request->company_name,
            'tax_id' => $request->tax_id,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'city' => $request->city,
            'country' => $request->country,
            'notes' => $request->notes,
            'is_active' => $request->is_active ?? true,
            'created_by' => auth()->id(),
        ]);

        $supplier->load('creator');

        return response()->json([
            'success' => true,
            'message' => 'Supplier created successfully',
            'data' => $supplier,
        ], 201);
    }

    /**
     * Mostrar proveedor
     */
    public function show(string $id)
    {
        $supplier = Supplier::with(['creator', 'products', 'purchaseOrders'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => array_merge($supplier->toArray(), [
                'total_spent' => $supplier->total_spent,
                'total_orders' => $supplier->total_orders,
            ]),
        ]);
    }

    /**
     * Actualizar proveedor
     */
    public function update(UpdateSupplierRequest $request, string $id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update($request->validated());
        $supplier->load('creator');

        return response()->json([
            'success' => true,
            'message' => 'Supplier updated successfully',
            'data' => $supplier,
        ]);
    }

    /**
     * Eliminar proveedor
     */
    public function destroy(string $id)
    {
        $supplier = Supplier::findOrFail($id);

        // Verificar si tiene órdenes de compra
        if ($supplier->purchaseOrders()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete supplier with existing purchase orders',
            ], 409);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier deleted successfully',
        ]);
    }

    /**
     * Agregar productos al proveedor
     */
    public function attachProducts(Request $request, string $id)
    {
        $request->validate([
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.cost' => 'required|numeric|min:0',
            'products.*.supplier_sku' => 'nullable|string|max:100',
            'products.*.lead_time_days' => 'nullable|integer|min:0',
            'products.*.is_preferred' => 'boolean',
        ]);

        $supplier = Supplier::findOrFail($id);

        foreach ($request->products as $productData) {
            $supplier->products()->syncWithoutDetaching([
                $productData['product_id'] => [
                    'cost' => $productData['cost'],
                    'supplier_sku' => $productData['supplier_sku'] ?? null,
                    'lead_time_days' => $productData['lead_time_days'] ?? null,
                    'is_preferred' => $productData['is_preferred'] ?? false,
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Products attached to supplier successfully',
        ]);
    }

    /**
     * Remover producto del proveedor
     */
    public function detachProduct(string $supplierId, string $productId)
    {
        $supplier = Supplier::findOrFail($supplierId);
        $supplier->products()->detach($productId);

        return response()->json([
            'success' => true,
            'message' => 'Product removed from supplier successfully',
        ]);
    }
}