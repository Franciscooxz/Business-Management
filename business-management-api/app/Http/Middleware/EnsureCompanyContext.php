<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureCompanyContext
 *
 * Valida que el usuario autenticado tenga una empresa asignada antes de
 * acceder a cualquier endpoint ERP. También valida el header X-Company-Id
 * para evitar que un usuario intente suplantar otra empresa.
 */
class EnsureCompanyContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        // Si no hay usuario autenticado, Sanctum ya lo rechaza antes
        if (! $user) {
            return $next($request);
        }

        // ── Super admin bypassa el contexto de empresa ───────────────────────
        if ($user->hasRole('super_admin')) {
            return $next($request);
        }

        // ── Verificar que el usuario tenga empresa asignada ───────────────────
        if (! $user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'Su usuario no tiene una empresa asignada. Contacte al administrador.',
                'code'    => 'NO_COMPANY',
            ], 403);
        }

        // ── Validar header X-Company-Id si viene en el request ───────────────
        $requestedCompanyId = $request->header('X-Company-Id');

        if ($requestedCompanyId && (int) $requestedCompanyId !== (int) $user->company_id) {
            return response()->json([
                'success' => false,
                'message' => 'No tiene acceso a la empresa solicitada.',
                'code'    => 'COMPANY_MISMATCH',
            ], 403);
        }

        return $next($request);
    }
}
