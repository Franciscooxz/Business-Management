<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    /** Máximo de intentos fallidos antes de bloquear */
    private const MAX_ATTEMPTS = 5;

    /** Tiempo de bloqueo en segundos (15 minutos) */
    private const DECAY_SECONDS = 900;

    // ── Clave única por email + IP ────────────────────────────────────────────
    private function throttleKey(Request $request): string
    {
        return 'login:' . Str::lower($request->email) . '|' . $request->ip();
    }

    // ─────────────────────────────────────────────────────────────────────────

    public function register(RegisterRequest $request): JsonResponse
    {
        $userRole = Role::where('name', 'user')->where('guard_name', 'web')->first()
            ?? Role::where('guard_name', 'web')->first();

        $user = User::create([
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => $request->password,
            'role_id'   => $userRole?->id,
            'is_active' => true,
        ]);

        if ($userRole) {
            $user->assignRole($userRole->name);
        }

        $user->load('role', 'company');
        $token = $user->createToken('auth_token')->plainTextToken;

        // Auditoría: registro de nuevo usuario
        AuditLog::record('created', $user, null, ['name' => $user->name, 'email' => $user->email]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado exitosamente.',
            'data'    => [
                'user'         => $this->formatUser($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $throttleKey = $this->throttleKey($request);

        // ── Verificar si está bloqueado por intentos fallidos ─────────────────
        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            $minutes = ceil($seconds / 60);

            // Auditoría: acceso bloqueado
            AuditLog::record(
                event:       'login_failed',
                description: "Acceso bloqueado para {$request->email} — demasiados intentos. Desbloqueo en {$minutes} min."
            );

            return response()->json([
                'success' => false,
                'message' => "Cuenta bloqueada por demasiados intentos fallidos. Intenta nuevamente en {$minutes} minuto(s).",
                'retry_after_seconds' => $seconds,
            ], 429);
        }

        // ── Verificar credenciales ────────────────────────────────────────────
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Incrementar contador de intentos fallidos
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);

            $remaining = self::MAX_ATTEMPTS - RateLimiter::attempts($throttleKey);

            // Auditoría: intento fallido
            AuditLog::record(
                event:       'login_failed',
                description: "Credenciales incorrectas para {$request->email} desde IP {$request->ip()}. Intentos restantes: {$remaining}"
            );

            throw ValidationException::withMessages([
                'email' => [
                    $remaining > 0
                        ? "Credenciales incorrectas. Te quedan {$remaining} intento(s) antes del bloqueo."
                        : 'Credenciales incorrectas.',
                ],
            ]);
        }

        // ── Cuenta desactivada ────────────────────────────────────────────────
        if (! $user->is_active) {
            AuditLog::record('login_failed', $user, null, null, 'Cuenta desactivada');

            return response()->json([
                'success' => false,
                'message' => 'Su cuenta ha sido desactivada. Contacte al administrador.',
            ], 403);
        }

        // ── Login exitoso — limpiar contador ──────────────────────────────────
        RateLimiter::clear($throttleKey);

        $user->load('role', 'company');
        $token = $user->createToken('auth_token')->plainTextToken;

        // Auditoría: login exitoso
        AuditLog::record(
            event:       'login',
            model:       $user,
            description: "Inicio de sesión desde IP {$request->ip()}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Inicio de sesión exitoso.',
            'data'    => [
                'user'         => $this->formatUser($user),
                'access_token' => $token,
                'token_type'   => 'Bearer',
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Auditoría: cierre de sesión
        AuditLog::record('logout', $user, null, null, 'Cierre de sesión voluntario');

        $user->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada exitosamente.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('role', 'company');

        return response()->json([
            'success' => true,
            'data'    => $this->formatUser($user),
        ]);
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
                'id'               => $user->company->id,
                'name'             => $user->company->name,
                'nit'              => $user->company->nit,
                'nit_dv'           => $user->company->nit_dv,
                'razon_social'     => $user->company->razon_social,
                'nombre_comercial' => $user->company->nombre_comercial,
                'dian_ambiente'    => $user->company->dian_ambiente,
                'logo_path'        => $user->company->logo_path,
            ] : null,
            'permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
            'roles'       => $user->getRoleNames()->toArray(),
        ];
    }
}
