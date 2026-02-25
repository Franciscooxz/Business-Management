<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $authUser = auth()->user();
        $query = User::with('roles');

        // Scope: admin solo ve usuarios de su empresa; super_admin ve todos
        if (! $authUser->hasRole('super_admin')) {
            $query->where('company_id', $authUser->company_id)
                  ->whereDoesntHave('roles', fn($q) => $q->where('name', 'super_admin'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->whereHas('roles', fn($q) => $q->where('name', $request->role));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('company_id') && $authUser->hasRole('super_admin')) {
            $query->where('company_id', $request->company_id);
        }

        $allowedOrderBy = ['name', 'email', 'created_at'];
        $orderBy = in_array($request->get('order_by', 'created_at'), $allowedOrderBy)
            ? $request->get('order_by', 'created_at')
            : 'created_at';
        $order = in_array(strtolower($request->get('order', 'desc')), ['asc', 'desc'])
            ? strtolower($request->get('order', 'desc'))
            : 'desc';

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $users   = $query->orderBy($orderBy, $order)->paginate($perPage);

        return response()->json([
            'success'    => true,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'from'         => $users->firstItem(),
                'to'           => $users->lastItem(),
            ],
            'data' => $users->map(fn($user) => $this->formatUser($user)),
        ], 200);
    }

    public function store(StoreUserRequest $request)
    {
        $authUser  = auth()->user();
        $companyId = $authUser->hasRole('super_admin')
            ? ($request->company_id ?? null)
            : $authUser->company_id;

        // Obtener role_id desde Spatie si viene el nombre del rol
        $roleId = $request->role_id;
        if (! $roleId && $request->filled('role')) {
            $spatieRole = Role::where('name', $request->role)->first();
            $roleId = $spatieRole?->id;
        }

        $user = User::create([
            'name'       => $request->name,
            'email'      => $request->email,
            'password'   => $request->password,
            'role_id'    => $roleId,
            'company_id' => $companyId,
            'is_active'  => true,
        ]);

        // Asignar rol Spatie
        if ($request->filled('role')) {
            $user->assignRole($request->role);
        } elseif ($roleId) {
            $spatieRole = Role::find($roleId);
            if ($spatieRole) $user->assignRole($spatieRole->name);
        }

        $user->load('roles');

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente.',
            'data'    => $this->formatUser($user),
        ], 201);
    }

    public function show(string $id)
    {
        $user = $this->findUser($id);

        return response()->json([
            'success' => true,
            'data'    => $this->formatUser($user),
        ], 200);
    }

    public function update(UpdateUserRequest $request, string $id)
    {
        $user = $this->findUser($id);

        $data = $request->only(['name', 'email', 'password', 'is_active']);

        // Actualizar rol
        if ($request->filled('role')) {
            $spatieRole = Role::where('name', $request->role)->first();
            if ($spatieRole) {
                $data['role_id'] = $spatieRole->id;
                $user->syncRoles([$request->role]);
            }
        } elseif ($request->filled('role_id')) {
            $data['role_id'] = $request->role_id;
            $spatieRole = Role::find($request->role_id);
            if ($spatieRole) $user->syncRoles([$spatieRole->name]);
        }

        // Super admin puede reasignar empresa
        if (auth()->user()->hasRole('super_admin') && $request->filled('company_id')) {
            $data['company_id'] = $request->company_id ?: null;
        }

        $user->update($data);
        $user->load('roles');

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado.',
            'data'    => $this->formatUser($user),
        ], 200);
    }

    public function destroy(string $id)
    {
        $user = $this->findUser($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propia cuenta.',
            ], 403);
        }

        if ($user->hasRole('super_admin')) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar al super administrador.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado.',
        ], 200);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function findUser(string $id): User
    {
        $authUser = auth()->user();
        $user     = User::with('roles')->findOrFail($id);

        // Admin solo puede gestionar usuarios de su empresa
        if (! $authUser->hasRole('super_admin') && $user->company_id !== $authUser->company_id) {
            abort(403, 'No tiene acceso a este usuario.');
        }

        return $user;
    }

    private function formatUser(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->roles->first()?->name ?? '—',
            'role_id'    => $user->role_id,
            'company_id' => $user->company_id,
            'is_active'  => $user->is_active,
            'created_at' => $user->created_at,
        ];
    }
}
