<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        // Verificar que el usuario esté autenticado
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $user = $request->user();
        $user->load('role');

        // Verifica rol legacy (role_id FK) O rol Spatie — cualquiera que coincida
        $legacyRole  = $user->role?->name;
        $spatieRoles = $user->getRoleNames()->toArray();

        if ($legacyRole !== $role && ! in_array($role, $spatieRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. This action requires ' . $role . ' role.',
            ], 403);
        }

        return $next($request);
    }
}