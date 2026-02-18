<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('role');

        // BÚSQUEDA POR TEXTO
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // FILTRO POR ROL
        if ($request->has('role') && $request->role != '') {
            $query->whereHas('role', function($q) use ($request) {
                $q->where('name', $request->role);
            });
        }

        // FILTRO POR ESTADO
        if ($request->has('is_active') && $request->is_active != '') {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        // ORDENAMIENTO
        $orderBy = $request->get('order_by', 'created_at');
        $order = $request->get('order', 'desc');

        $allowedOrderBy = ['name', 'email', 'created_at'];
        if (!in_array($orderBy, $allowedOrderBy)) {
            $orderBy = 'created_at';
        }

        $order = strtolower($order);
        if (!in_array($order, ['asc', 'desc'])) {
            $order = 'desc';
        }

        $query->orderBy($orderBy, $order);

        // PAGINACIÓN
        $perPage = $request->get('per_page', 15); // Default: 15 para usuarios
        $perPage = min(max((int)$perPage, 1), 100);

        $users = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'filters_applied' => [
                'search' => $request->search ?? null,
                'role' => $request->role ?? null,
                'is_active' => $request->is_active ?? null,
                'order_by' => $orderBy,
                'order' => $order,
            ],
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ],
            'data' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->name,
                    'is_active' => $user->is_active,
                    'created_at' => $user->created_at,
                ];
            }),
        ], 200);
    }

    public function store(StoreUserRequest $request) // 👈 CAMBIO
    {
        // Validación y autorización ya hechas
        
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role_id' => $request->role_id,
            'is_active' => true,
        ]);

        $user->load('role');

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name,
                'is_active' => $user->is_active,
            ],
        ], 201);
    }

    public function show(string $id)
    {
        $user = User::with('role')->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
        ], 200);
    }

    public function update(UpdateUserRequest $request, string $id) // 👈 CAMBIO
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        // Actualizar solo campos presentes
        $user->update($request->only(['name', 'email', 'password', 'role_id', 'is_active']));
        $user->load('role');

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name,
                'is_active' => $user->is_active,
            ],
        ], 200);
    }

    public function destroy(string $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully',
        ], 200);
    }
}