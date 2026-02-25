<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Models\AccountPayable;
use App\Services\Treasury\TreasuryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountsPayableController extends Controller
{
    public function __construct(private readonly TreasuryService $treasury) {}

    /** GET /api/treasury/accounts-payable */
    public function index(Request $request): JsonResponse
    {
        // Auto-actualizar vencidas
        AccountPayable::whereIn('status', ['pendiente', 'parcial'])
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'vencido']);

        $query = AccountPayable::with(['thirdParty', 'purchaseOrder'])
            ->when($request->get('status'),         fn($q, $v) => $q->where('status', $v))
            ->when($request->get('third_party_id'), fn($q, $v) => $q->where('third_party_id', $v))
            ->when($request->get('date_from'),      fn($q, $v) => $q->whereDate('due_date', '>=', $v))
            ->when($request->get('date_to'),        fn($q, $v) => $q->whereDate('due_date', '<=', $v))
            ->when($request->get('overdue'),        fn($q)     => $q->overdue())
            ->when($request->get('search'), function ($q, $s) {
                $q->whereHas('thirdParty', fn($q) =>
                    $q->where('business_name', 'like', "%{$s}%")
                      ->orWhere('document_number', 'like', "%{$s}%")
                );
            })
            ->orderBy('due_date')
            ->paginate($request->get('per_page', 20));

        return response()->json($query);
    }

    /** GET /api/treasury/accounts-payable/aging */
    public function aging(): JsonResponse
    {
        $buckets = [
            'vigente' => ['min' => null, 'max' => 0],
            '1-30'    => ['min' => 1,    'max' => 30],
            '31-60'   => ['min' => 31,   'max' => 60],
            '61-90'   => ['min' => 61,   'max' => 90],
            '+90'     => ['min' => 91,   'max' => null],
        ];

        $result = [];
        $today  = now();

        foreach ($buckets as $label => $range) {
            $query = AccountPayable::whereIn('status', ['pendiente', 'parcial', 'vencido']);
            if ($range['min'] === null) {
                $query->where('due_date', '>=', $today->toDateString());
            } elseif ($range['max'] === null) {
                $query->where('due_date', '<', $today->copy()->subDays($range['min'] - 1)->toDateString());
            } else {
                $query->whereBetween('due_date', [
                    $today->copy()->subDays($range['max'])->toDateString(),
                    $today->copy()->subDays($range['min'] - 1)->toDateString(),
                ]);
            }

            $result[$label] = [
                'count'  => $query->count(),
                'amount' => $query->sum('pending_amount'),
            ];
        }

        return response()->json([
            'data' => $result,
            'total_pending' => AccountPayable::whereIn('status', ['pendiente', 'parcial', 'vencido'])->sum('pending_amount'),
        ]);
    }

    /** GET /api/treasury/accounts-payable/{id} */
    public function show(AccountPayable $accountsPayable): JsonResponse
    {
        $accountsPayable->load(['thirdParty', 'purchaseOrder', 'payments.treasuryMovement']);
        return response()->json([
            'data' => array_merge($accountsPayable->toArray(), [
                'days_overdue'  => $accountsPayable->days_overdue,
                'aging_bucket'  => $accountsPayable->aging_bucket,
            ]),
        ]);
    }

    /** POST /api/treasury/accounts-payable */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_order_id' => 'nullable|exists:purchase_orders,id',
            'third_party_id'    => 'required|exists:third_parties,id',
            'supplier_invoice'  => 'nullable|string|max:100',
            'issue_date'        => 'required|date',
            'due_date'          => 'required|date|after_or_equal:issue_date',
            'total_amount'      => 'required|numeric|min:0.01',
            'notes'             => 'nullable|string|max:500',
        ]);

        $validated['pending_amount'] = $validated['total_amount'];
        $validated['paid_amount']    = 0;

        $ap = AccountPayable::create($validated);
        return response()->json(['data' => $ap->load('thirdParty')], 201);
    }

    /** POST /api/treasury/accounts-payable/{id}/pay */
    public function pay(Request $request, AccountPayable $accountsPayable): JsonResponse
    {
        if (!in_array($accountsPayable->status, ['pendiente', 'parcial', 'vencido'])) {
            return response()->json(['message' => 'Esta cuenta ya está pagada o anulada.'], 422);
        }

        $validated = $request->validate([
            'bank_account_id'      => 'required|exists:bank_accounts,id',
            'amount'               => 'required|numeric|min:0.01|max:' . $accountsPayable->pending_amount,
            'movement_date'        => 'required|date',
            'reference'            => 'nullable|string|max:100',
            'description'          => 'nullable|string|max:300',
            'retention_retefuente' => 'nullable|numeric|min:0',
            'retention_reteiva'    => 'nullable|numeric|min:0',
            'retention_reteica'    => 'nullable|numeric|min:0',
        ]);

        try {
            $movement = $this->treasury->applyApPayment($accountsPayable, $validated);
            return response()->json([
                'data'    => $accountsPayable->fresh('thirdParty'),
                'movement'=> $movement,
                'message' => 'Pago registrado correctamente.',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
