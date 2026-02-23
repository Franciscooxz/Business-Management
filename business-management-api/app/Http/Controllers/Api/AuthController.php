<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $userRole = Role::where('name', 'user')->first();

        if (!$userRole) {
            return response()->json([
                'success' => false,
                'message' => 'Default role not found. Please run seeders.',
            ], 500);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => $request->password,
            'role_id'  => $userRole->id,
            'is_active' => true,
        ]);

        $user->load('role', 'company');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado exitosamente.',
            'data' => [
                'user'         => $this->formatUser($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Su cuenta ha sido desactivada.',
            ], 403);
        }

        $user->load('role', 'company');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Inicio de sesion exitoso.',
            'data' => [
                'user'         => $this->formatUser($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesion cerrada exitosamente.',
        ], 200);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('role', 'company');

        return response()->json([
            'success' => true,
            'data'    => $this->formatUser($user),
        ], 200);
    }

    private function formatUser(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'role'        => $user->role?->name,
            'is_active'   => $user->is_active,
            'company_id'  => $user->company_id,
            'company'     => $user->company ? [
                'id'             => $user->company->id,
                'name'           => $user->company->name,
                'nit'            => $user->company->nit,
                'nit_dv'         => $user->company->nit_dv,
                'razon_social'   => $user->company->razon_social,
                'nombre_comercial' => $user->company->nombre_comercial,
                'dian_ambiente'  => $user->company->dian_ambiente,
                'logo_path'      => $user->company->logo_path,
            ] : null,
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            'roles'       => $user->getRoleNames()->toArray(),
        ];
    }
}