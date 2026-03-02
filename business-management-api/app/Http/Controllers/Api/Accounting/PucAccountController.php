<?php

namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Models\PucAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PucAccountController extends Controller
{
    /** TTL del caché del árbol PUC: 24 horas */
    private const TREE_CACHE_TTL = 86400;

    /** Clave de caché por empresa */
    private function treeCacheKey(): string
    {
        $companyId = auth()->user()?->company_id ?? 0;
        return "puc_tree_{$companyId}";
    }

    /** Invalida el caché del árbol para la empresa actual */
    private function flushTreeCache(): void
    {
        Cache::forget($this->treeCacheKey());
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retorna el árbol PUC completo (con caché de 24h por empresa).
     */
    public function tree(Request $request): JsonResponse
    {
        // Búsqueda en tiempo real — sin caché para no mezclar resultados filtrados
        if ($request->filled('search')) {
            $search   = $request->search;
            $accounts = PucAccount::where(function ($q) use ($search) {
                $q->where('code', 'like', $search . '%')
                  ->orWhere('name', 'like', "%{$search}%");
            })
            ->where('is_active', true)
            ->orderBy('code')
            ->limit(50)
            ->get();

            return response()->json(['success' => true, 'data' => $accounts, 'mode' => 'flat']);
        }

        $activeOnly = $request->boolean('active_only', false);

        // Cache solo del árbol completo (el más costoso)
        $cacheKey = $activeOnly ? $this->treeCacheKey() . '_active' : $this->treeCacheKey();

        $tree = Cache::remember($cacheKey, self::TREE_CACHE_TTL, function () use ($activeOnly) {
            $query = PucAccount::where('parent_id', null)
                ->with('children.children.children.children.children')
                ->orderBy('code');

            if ($activeOnly) {
                $query->where('is_active', true);
            }

            return $query->get();
        });

        return response()->json(['success' => true, 'data' => $tree, 'mode' => 'tree']);
    }

    /**
     * Lista plana para selectores.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PucAccount::query()->orderBy('code');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', $search . '%')
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('allows_entries', false)) {
            $query->where('allows_entries', true);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        $accounts = $query->limit(100)->get();

        return response()->json(['success' => true, 'data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'                  => 'required|string|max:20',
            'name'                  => 'required|string|max:255',
            'description'           => 'nullable|string',
            'parent_id'             => 'nullable|exists:puc_accounts,id',
            'level'                 => 'required|integer|min:1|max:5',
            'type'                  => 'required|in:activo,pasivo,patrimonio,ingreso,gasto,costo,orden',
            'nature'                => 'required|in:debito,credito',
            'allows_entries'        => 'boolean',
            'requires_third'        => 'boolean',
            'requires_cost_center'  => 'boolean',
            'requires_document'     => 'boolean',
            'iva_tax_code'          => 'nullable|string|max:10',
            'rete_fuente_rate'      => 'nullable|numeric|min:0|max:1',
        ]);

        $account = PucAccount::create($data);

        // Invalidar árbol cacheado
        $this->flushTreeCache();

        return response()->json([
            'success' => true,
            'message' => 'Cuenta creada exitosamente.',
            'data'    => $account,
        ], 201);
    }

    public function show(PucAccount $pucAccount): JsonResponse
    {
        $pucAccount->load('parent', 'children');

        return response()->json(['success' => true, 'data' => $pucAccount]);
    }

    public function update(Request $request, PucAccount $pucAccount): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'sometimes|string|max:255',
            'description'           => 'nullable|string',
            'allows_entries'        => 'boolean',
            'requires_third'        => 'boolean',
            'requires_cost_center'  => 'boolean',
            'requires_document'     => 'boolean',
            'iva_tax_code'          => 'nullable|string|max:10',
            'rete_fuente_rate'      => 'nullable|numeric|min:0|max:1',
            'is_active'             => 'boolean',
        ]);

        $pucAccount->update($data);

        // Invalidar árbol cacheado
        $this->flushTreeCache();

        return response()->json([
            'success' => true,
            'message' => 'Cuenta actualizada.',
            'data'    => $pucAccount,
        ]);
    }
}
