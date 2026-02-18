<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * Listar clientes con búsqueda y paginación
     */
    public function index(Request $request)
    {
        $query = Customer::with('creator');

        // Búsqueda
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Ordenar
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $customers = $query->paginate($perPage);

        return CustomerResource::collection($customers)->additional([
            'success' => true,
            'message' => 'Customers retrieved successfully',
        ]);
    }

    /**
     * Crear nuevo cliente
     */
    public function store(StoreCustomerRequest $request)
    {
        $customer = Customer::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'address' => $request->address,
            'created_by' => auth()->id(),
        ]);

        $customer->load('creator');

        return (new CustomerResource($customer))->additional([
            'success' => true,
            'message' => 'Customer created successfully',
        ])->response()->setStatusCode(201);
    }

    /**
     * Mostrar un cliente específico
     */
    public function show(string $id)
    {
        $customer = Customer::with(['creator', 'sales.items'])->findOrFail($id);

        return (new CustomerResource($customer))->additional([
            'success' => true,
            'message' => 'Customer retrieved successfully',
        ]);
    }

    /**
     * Actualizar cliente
     */
    public function update(UpdateCustomerRequest $request, string $id)
    {
        $customer = Customer::findOrFail($id);

        $customer->update($request->validated());
        $customer->load('creator');

        return (new CustomerResource($customer))->additional([
            'success' => true,
            'message' => 'Customer updated successfully',
        ]);
    }

    /**
     * Eliminar cliente
     */
    public function destroy(string $id)
    {
        $customer = Customer::findOrFail($id);

        // Verificar si tiene ventas
        if ($customer->sales()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete customer with existing sales',
            ], 409);
        }

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Customer deleted successfully',
        ]);
    }

    /**
     * Historial de compras del cliente
     */
    public function sales(string $id)
    {
        $customer = Customer::findOrFail($id);
        $sales = $customer->sales()->with(['items.product', 'user'])->latest()->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $sales,
        ]);
    }
}