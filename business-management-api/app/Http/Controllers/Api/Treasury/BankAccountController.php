<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\TreasuryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    /** GET /api/treasury/bank-accounts */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $accounts = BankAccount::with('pucAccount')
            ->where('company_id', $companyId)
            ->when($request->boolean('active'), fn($q) => $q->active())
            ->when($request->get('type'), fn($q, $v) => $q->where('type', $v))
            ->orderBy('name')
            ->get()
            ->map(fn($a) => array_merge($a->toArray(), [
                'type_label' => $a->type_label,
                'is_cash'    => $a->is_cash,
            ]));

        return response()->json(['data' => $accounts]);
    }

    /** GET /api/treasury/bank-accounts/{id} */
    public function show(BankAccount $bankAccount): JsonResponse
    {
        $bankAccount->load('pucAccount');
        return response()->json([
            'data' => array_merge($bankAccount->toArray(), [
                'type_label' => $bankAccount->type_label,
            ]),
        ]);
    }

    /** POST /api/treasury/bank-accounts */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:100',
            'account_number'        => 'nullable|string|max:50',
            'type'                  => 'required|in:corriente,ahorros,caja_menor,fondo_fijo,tarjeta_credito',
            'bank_name'             => 'nullable|string|max:100',
            'currency'              => 'nullable|string|max:3',
            'initial_balance'       => 'nullable|numeric|min:0',
            'initial_balance_date'  => 'nullable|date',
            'puc_account_id'        => 'nullable|exists:puc_accounts,id',
            'notes'                 => 'nullable|string|max:500',
            'is_active'             => 'boolean',
        ]);

        $validated['company_id']      = auth()->user()->company_id;
        $validated['current_balance'] = $validated['initial_balance'] ?? 0;

        $account = BankAccount::create($validated);
        return response()->json(['data' => $account], 201);
    }

    /** PUT /api/treasury/bank-accounts/{id} */
    public function update(Request $request, BankAccount $bankAccount): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'sometimes|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'type'           => 'sometimes|in:corriente,ahorros,caja_menor,fondo_fijo,tarjeta_credito',
            'bank_name'      => 'nullable|string|max:100',
            'currency'       => 'nullable|string|max:3',
            'puc_account_id' => 'nullable|exists:puc_accounts,id',
            'notes'          => 'nullable|string|max:500',
            'is_active'      => 'boolean',
        ]);

        $bankAccount->update($validated);
        return response()->json(['data' => $bankAccount->fresh('pucAccount')]);
    }

    /** DELETE /api/treasury/bank-accounts/{id} */
    public function destroy(BankAccount $bankAccount): JsonResponse
    {
        if (TreasuryMovement::where('bank_account_id', $bankAccount->id)->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar una cuenta con movimientos registrados.',
            ], 422);
        }
        $bankAccount->delete();
        return response()->json(null, 204);
    }

    /** GET /api/treasury/bank-accounts/{id}/movements */
    public function movements(Request $request, BankAccount $bankAccount): JsonResponse
    {
        $paginator = TreasuryMovement::with('thirdParty')
            ->where('bank_account_id', $bankAccount->id)
            ->where('status', '!=', 'anulado')
            ->when($request->get('date_from'), fn($q, $v) => $q->whereDate('movement_date', '>=', $v))
            ->when($request->get('date_to'),   fn($q, $v) => $q->whereDate('movement_date', '<=', $v))
            ->orderBy('movement_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    /** GET /api/treasury/bank-accounts/summary */
    public function summary(): JsonResponse
    {
        $companyId = auth()->user()->company_id;
        $accounts  = BankAccount::where('company_id', $companyId)->active()->get();
        return response()->json([
            'data' => [
                'accounts'      => $accounts,
                'total_balance' => $accounts->sum('current_balance'),
                'by_type'       => $accounts->groupBy('type')->map(fn($g) => [
                    'count'   => $g->count(),
                    'balance' => $g->sum('current_balance'),
                ]),
            ],
        ]);
    }
}
