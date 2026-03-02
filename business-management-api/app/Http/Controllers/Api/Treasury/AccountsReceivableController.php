<?php

namespace App\Http\Controllers\Api\Treasury;

use App\Http\Controllers\Controller;
use App\Models\AccountReceivable;
use App\Services\Treasury\TreasuryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountsReceivableController extends Controller
{
    public function __construct(private readonly TreasuryService $treasury) {}

    /** GET /api/treasury/accounts-receivable */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        // Auto-actualizar vencidas (solo de esta empresa)
        AccountReceivable::where('company_id', $companyId)
            ->whereIn('status', ['pendiente', 'parcial'])
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'vencido']);

        $paginator = AccountReceivable::with(['thirdParty', 'invoice'])
            ->where('company_id', $companyId)
            ->when($request->get('status'),         fn($q, $v) => $q->where('status', $v))
            ->when($request->get('third_party_id'), fn($q, $v) => $q->where('third_party_id', $v))
            ->when($request->get('date_from'),      fn($q, $v) => $q->whereDate('due_date', '>=', $v))
            ->when($request->get('date_to'),        fn($q, $v) => $q->whereDate('due_date', '<=', $v))
            ->when($request->get('overdue'),        fn($q)     => $q->overdue())
            ->when($request->get('search'), function ($q, $s) {
                $q->whereHas('thirdParty', fn($q) =>
                    $q->where('razon_social', 'like', "%{$s}%")
                      ->orWhere('nombre_comercial', 'like', "%{$s}%")
                      ->orWhere('document_number', 'like', "%{$s}%")
                );
            })
            ->orderBy('due_date')
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

    /** GET /api/treasury/accounts-receivable/aging */
    public function aging(): JsonResponse
    {
        $companyId = auth()->user()->company_id;

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
            $query = AccountReceivable::where('company_id', $companyId)
                         ->whereIn('status', ['pendiente', 'parcial', 'vencido']);
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
            'total_pending' => AccountReceivable::where('company_id', $companyId)->whereIn('status', ['pendiente', 'parcial', 'vencido'])->sum('pending_amount'),
        ]);
    }

    /** GET /api/treasury/accounts-receivable/{id} */
    public function show(AccountReceivable $accountsReceivable): JsonResponse
    {
        $accountsReceivable->load(['thirdParty', 'invoice', 'payments.treasuryMovement']);
        return response()->json([
            'data' => array_merge($accountsReceivable->toArray(), [
                'days_overdue'  => $accountsReceivable->days_overdue,
                'aging_bucket'  => $accountsReceivable->aging_bucket,
            ]),
        ]);
    }

    /** POST /api/treasury/accounts-receivable */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_id'      => 'nullable|exists:electronic_invoices,id',
            'third_party_id'  => 'required|exists:third_parties,id',
            'document_number' => 'nullable|string|max:50',
            'issue_date'      => 'required|date',
            'due_date'        => 'required|date|after_or_equal:issue_date',
            'total_amount'    => 'required|numeric|min:0.01',
            'notes'           => 'nullable|string|max:500',
        ]);

        $validated['company_id']     = auth()->user()->company_id;
        $validated['pending_amount'] = $validated['total_amount'];
        $validated['paid_amount']    = 0;

        $ar = AccountReceivable::create($validated);
        return response()->json(['data' => $ar->load('thirdParty')], 201);
    }

    /** POST /api/treasury/accounts-receivable/{id}/pay */
    public function pay(Request $request, AccountReceivable $accountsReceivable): JsonResponse
    {
        if (!in_array($accountsReceivable->status, ['pendiente', 'parcial', 'vencido'])) {
            return response()->json(['message' => 'Esta cuenta ya está pagada o anulada.'], 422);
        }

        $validated = $request->validate([
            'bank_account_id'      => 'required|exists:bank_accounts,id',
            'amount'               => 'required|numeric|min:0.01|max:' . $accountsReceivable->pending_amount,
            'movement_date'        => 'required|date',
            'reference'            => 'nullable|string|max:100',
            'description'          => 'nullable|string|max:300',
            'retention_retefuente' => 'nullable|numeric|min:0',
            'retention_reteiva'    => 'nullable|numeric|min:0',
            'retention_reteica'    => 'nullable|numeric|min:0',
        ]);

        try {
            $movement = $this->treasury->applyArPayment($accountsReceivable, $validated);
            return response()->json([
                'data'    => $accountsReceivable->fresh('thirdParty'),
                'movement'=> $movement,
                'message' => 'Pago registrado correctamente.',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
