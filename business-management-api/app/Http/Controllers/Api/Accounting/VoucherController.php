<?php

namespace App\Http\Controllers\Api\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use App\Models\AccountingPeriod;
use App\Services\Accounting\JournalEntryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VoucherController extends Controller
{
    public function __construct(
        private JournalEntryService $journalService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Voucher::with(['period', 'thirdParty', 'createdBy'])
            ->orderByDesc('date')
            ->orderByDesc('consecutive');

        if ($request->filled('voucher_type')) {
            $query->where('voucher_type', $request->voucher_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('period_id')) {
            $query->where('period_id', $request->period_id);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $paginator = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $paginator->items(),
            'meta'    => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'from'         => $paginator->firstItem(),
                'to'           => $paginator->lastItem(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'voucher_type'   => 'required|in:ingreso,egreso,diario,ajuste,apertura,cierre,nota_debito,nota_credito',
            'date'           => 'required|date',
            'description'    => 'required|string|max:500',
            'third_party_id' => 'nullable|exists:third_parties,id',
            'cost_center_id' => 'nullable|exists:cost_centers,id',
            'currency_id'    => 'nullable|exists:currencies,id',
            'exchange_rate'  => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string',
            'lines'          => 'required|array|min:2',
            'lines.*.account_id'     => 'required|exists:puc_accounts,id',
            'lines.*.debit'          => 'nullable|numeric|min:0',
            'lines.*.credit'         => 'nullable|numeric|min:0',
            'lines.*.description'    => 'nullable|string|max:255',
            'lines.*.third_party_id' => 'nullable|exists:third_parties,id',
            'lines.*.cost_center_id' => 'nullable|exists:cost_centers,id',
            'lines.*.tax_base'       => 'nullable|numeric|min:0',
            'lines.*.tax_rate'       => 'nullable|numeric|min:0|max:1',
            'lines.*.tax_type'       => 'nullable|in:iva,retefuente,reteica,reteiva',
        ]);

        $data['company_id'] = $request->user()->company_id;
        $data['created_by'] = $request->user()->id;

        $voucher = $this->journalService->create($data);

        return response()->json([
            'success' => true,
            'message' => 'Comprobante creado en borrador.',
            'data'    => $voucher,
        ], 201);
    }

    public function show(Voucher $voucher): JsonResponse
    {
        $voucher->load(['lines.account', 'lines.thirdParty', 'period', 'thirdParty', 'createdBy', 'postedBy']);

        return response()->json(['success' => true, 'data' => $voucher]);
    }

    public function post(Request $request, Voucher $voucher): JsonResponse
    {
        $posted = $this->journalService->post($voucher, $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Comprobante contabilizado exitosamente.',
            'data'    => $posted,
        ]);
    }

    public function reverse(Request $request, Voucher $voucher): JsonResponse
    {
        $request->validate(['reason' => 'required|string|max:255']);

        $reversal = $this->journalService->reverse($voucher, $request->user()->id, $request->reason);

        return response()->json([
            'success' => true,
            'message' => 'Comprobante reversado. Nuevo comprobante: '.$reversal->full_number,
            'data'    => $reversal,
        ]);
    }
}
