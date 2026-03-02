<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Models\TreasuryMovement;
use App\Services\Treasury\TreasuryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryMovementController extends Controller
{
    public function __construct(private readonly TreasuryService $treasury) {}

    /** GET /api/treasury/movements */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $movements = TreasuryMovement::with(['bankAccount', 'thirdParty', 'destinationAccount'])
            ->where('company_id', $companyId)
            ->when($request->get('type'),            fn($q, $v) => $q->where('type', $v))
            ->when($request->get('concept'),         fn($q, $v) => $q->where('concept', $v))
            ->when($request->get('bank_account_id'), fn($q, $v) => $q->where('bank_account_id', $v))
            ->when($request->get('third_party_id'),  fn($q, $v) => $q->where('third_party_id', $v))
            ->when($request->get('date_from'),       fn($q, $v) => $q->whereDate('movement_date', '>=', $v))
            ->when($request->get('date_to'),         fn($q, $v) => $q->whereDate('movement_date', '<=', $v))
            ->when($request->get('reconciled') !== null, fn($q) =>
                $q->where('is_reconciled', $request->boolean('reconciled'))
            )
            ->when($request->get('search'), function ($q, $s) {
                $q->where(function ($q) use ($s) {
                    $q->where('description', 'like', "%{$s}%")
                      ->orWhere('reference', 'like', "%{$s}%");
                });
            })
            ->orderBy('movement_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $movements->items(),
            'meta' => [
                'current_page' => $movements->currentPage(),
                'last_page'    => $movements->lastPage(),
                'per_page'     => $movements->perPage(),
                'total'        => $movements->total(),
            ],
        ]);
    }

    /** GET /api/treasury/movements/{id} */
    public function show(TreasuryMovement $movement): JsonResponse
    {
        $movement->load(['bankAccount', 'destinationAccount', 'thirdParty', 'voucher', 'createdBy']);
        return response()->json([
            'data' => array_merge($movement->toArray(), [
                'type_label'    => $movement->type_label,
                'concept_label' => $movement->concept_label,
            ]),
        ]);
    }

    /** POST /api/treasury/movements */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateMovement($request);
        $validated['company_id'] = auth()->user()->company_id;

        try {
            $movement = $this->treasury->registerMovement($validated);
            return response()->json(['data' => $movement], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** POST /api/treasury/movements/{id}/reverse */
    public function reverse(TreasuryMovement $movement): JsonResponse
    {
        if ($movement->status === 'anulado') {
            return response()->json(['message' => 'El movimiento ya está anulado.'], 422);
        }

        try {
            $movement = $this->treasury->reverseMovement($movement);
            return response()->json(['data' => $movement, 'message' => 'Movimiento anulado correctamente.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** GET /api/treasury/movements/types */
    public function types(): JsonResponse
    {
        return response()->json([
            'types'    => TreasuryMovement::TYPES,
            'concepts' => TreasuryMovement::CONCEPTS,
        ]);
    }

    /** GET /api/treasury/cash-flow */
    public function cashFlow(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;
        $from      = $request->get('date_from', now()->startOfMonth()->toDateString());
        $to        = $request->get('date_to',   now()->endOfMonth()->toDateString());

        $data = $this->treasury->getCashFlow($from, $to, $companyId);
        return response()->json(['data' => $data]);
    }

    private function validateMovement(Request $request): array
    {
        return $request->validate([
            'type'                   => 'required|in:ingreso,egreso,traslado',
            'concept'                => 'required|in:' . implode(',', array_keys(TreasuryMovement::CONCEPTS)),
            'bank_account_id'        => 'required|exists:bank_accounts,id',
            'destination_account_id' => 'nullable|exists:bank_accounts,id|different:bank_account_id',
            'third_party_id'         => 'nullable|exists:third_parties,id',
            'amount'                 => 'required|numeric|min:0.01',
            'currency'               => 'nullable|string|max:3',
            'exchange_rate'          => 'nullable|numeric|min:0.01',
            'retention_retefuente'   => 'nullable|numeric|min:0',
            'retention_reteiva'      => 'nullable|numeric|min:0',
            'retention_reteica'      => 'nullable|numeric|min:0',
            'movement_date'          => 'required|date',
            'description'            => 'nullable|string|max:500',
            'reference'              => 'nullable|string|max:100',
            'source_type'            => 'nullable|string|max:50',
            'source_id'              => 'nullable|integer',
        ]);
    }
}
