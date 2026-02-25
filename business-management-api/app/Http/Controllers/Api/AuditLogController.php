<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Lista de logs de auditoría con filtros.
     * Solo accesible por administradores.
     */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $query = AuditLog::where('company_id', $companyId)
            ->orderByDesc('created_at');

        // ── Filtros ───────────────────────────────────────────────────────────

        if ($request->filled('event')) {
            $query->where('event', $request->event);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('model_type')) {
            // Acepta nombre corto (Voucher) o completo (App\Models\Voucher)
            $type = $request->model_type;
            if (! str_contains($type, '\\')) {
                $type = 'App\\Models\\' . $type;
            }
            $query->where('model_type', $type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('user_name', 'ilike', "%{$s}%")
                  ->orWhere('model_label', 'ilike', "%{$s}%")
                  ->orWhere('description', 'ilike', "%{$s}%")
                  ->orWhere('ip_address', 'like', "%{$s}%");
            });
        }

        $logs = $query->paginate($request->get('per_page', 25));

        // Agregar etiquetas legibles
        $logs->getCollection()->transform(function ($log) {
            return array_merge($log->toArray(), [
                'event_label' => $log->event_label,
                'event_color' => $log->event_color,
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => $logs,
        ]);
    }

    /**
     * Resumen estadístico de actividad.
     */
    public function summary(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;
        $days      = (int) $request->get('days', 30);

        $since = now()->subDays($days);

        $byEvent = AuditLog::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->selectRaw('event, COUNT(*) as total')
            ->groupBy('event')
            ->pluck('total', 'event');

        $byUser = AuditLog::where('company_id', $companyId)
            ->where('created_at', '>=', $since)
            ->whereNotNull('user_id')
            ->selectRaw('user_id, user_name, COUNT(*) as total')
            ->groupBy('user_id', 'user_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        $recentFailed = AuditLog::where('company_id', $companyId)
            ->where('event', 'login_failed')
            ->where('created_at', '>=', now()->subHours(24))
            ->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'by_event'       => $byEvent,
                'by_user'        => $byUser,
                'failed_logins'  => $recentFailed,
                'period_days'    => $days,
            ],
        ]);
    }
}
