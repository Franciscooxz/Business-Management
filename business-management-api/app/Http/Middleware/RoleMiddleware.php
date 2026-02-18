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

        // Cargar la relación del rol
        $user = $request->user();
        $user->load('role');

        // Verificar que el usuario tenga el rol requerido
        if ($user->role->name !== $role) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. This action requires ' . $role . ' role.',
            ], 403);
        }

        return $next($request);
    }
}