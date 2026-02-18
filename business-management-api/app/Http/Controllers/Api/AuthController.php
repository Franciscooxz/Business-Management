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

class AuthController extends Controller
{
    /**
     * REGISTRO DE USUARIO
     */
    public function register(RegisterRequest $request) // 👈 CAMBIO AQUÍ
    {
        // Las validaciones ya se hicieron automáticamente
        
        $userRole = Role::where('name', 'user')->first();

        if (!$userRole) {
            return response()->json([
                'success' => false,
                'message' => 'Default role not found. Please run seeders.',
            ], 500);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'role_id' => $userRole->id,
            'is_active' => true,
        ]);

        $user->load('role');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->name,
                    'is_active' => $user->is_active,
                ],
                'access_token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 201);
    }

    /**
     * LOGIN DE USUARIO
     */
    public function login(LoginRequest $request) // 👈 CAMBIO AQUÍ
    {
        // Las validaciones ya se hicieron automáticamente
        
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        $user->load('role');
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->name,
                    'is_active' => $user->is_active,
                ],
                'access_token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ], 200);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('role');

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
            ],
        ], 200);
    }
}