<?php

namespace App\Http\Controllers\Api\Tax;

use App\Http\Controllers\Controller;
use App\Models\TaxDeclaration;
use App\Services\Tax\IvaService;
use App\Services\Tax\WithholdingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TaxDeclarationController extends Controller
{
    public function __construct(
        private readonly IvaService         $ivaService,
        private readonly WithholdingService $withholdingService,
    ) {}

    /** GET /api/taxes/declarations */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $query = TaxDeclaration::where('company_id', $companyId);

        if ($request->filled('type'))   { $query->where('type', $request->type); }
        if ($request->filled('year'))   { $query->where('year', $request->year); }
        if ($request->filled('status')) { $query->where('status', $request->status); }

        $declarations = $query
            ->orderByDesc('year')
            ->orderByDesc('period_number')
            ->get()
            ->append(['type_label', 'period_label']);

        return response()->json(['data' => $declarations]);
    }

    /** GET /api/taxes/declarations/{taxDeclaration} */
    public function show(TaxDeclaration $taxDeclaration): JsonResponse
    {
        $this->authorize($taxDeclaration);

        $taxDeclaration->load('entries.concept', 'entries.thirdParty', 'creator');

        return response()->json([
            'data' => $taxDeclaration->append(['type_label', 'period_label']),
        ]);
    }

    /** POST /api/taxes/declarations */
    public function store(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $validated = $request->validate([
            'type'                  => 'required|in:iva,retefuente,reteica,ica,renta',
            'period_type'           => 'required|in:mensual,bimestral,cuatrimestral,anual',
            'year'                  => 'required|integer|min:2020|max:2099',
            'period_number'         => 'required|integer|min:1|max:12',
            'previous_balance_favor'=> 'sometimes|numeric|min:0',
            'notes'                 => 'nullable|string',
        ]);

        [$startDate, $endDate] = $this->getPeriodDates(
            $validated['period_type'],
            (int) $validated['year'],
            (int) $validated['period_number']
        );

        $declaration = TaxDeclaration::create([
            ...$validated,
            'company_id'             => $companyId,
            'created_by'             => auth()->id(),
            'start_date'             => $startDate,
            'end_date'               => $endDate,
            'previous_balance_favor' => $validated['previous_balance_favor'] ?? 0,
        ]);

        return response()->json([
            'data' => $declaration->append(['type_label', 'period_label']),
        ], 201);
    }

    /** POST /api/taxes/declarations/{taxDeclaration}/calculate */
    public function calculate(TaxDeclaration $taxDeclaration): JsonResponse
    {
        $this->authorize($taxDeclaration);

        $totals = match ($taxDeclaration->type) {
            'iva'   => $this->ivaService->calculateDeclarationTotals($taxDeclaration),
            default => $this->withholdingService->calculateDeclarationTotals($taxDeclaration),
        };

        $taxDeclaration->update($totals);

        return response()->json([
            'data'    => $taxDeclaration->fresh()->append(['type_label', 'period_label']),
            'message' => 'Declaración calculada correctamente.',
        ]);
    }

    /** POST /api/taxes/declarations/{taxDeclaration}/present */
    public function present(TaxDeclaration $taxDeclaration): JsonResponse
    {
        $this->authorize($taxDeclaration);

        abort_if($taxDeclaration->status === 'pagada', 422, 'La declaración ya fue pagada.');

        $taxDeclaration->update([
            'status'       => 'presentada',
            'presented_at' => now(),
        ]);

        return response()->json(['data' => $taxDeclaration->fresh()->append(['type_label', 'period_label'])]);
    }

    /** POST /api/taxes/declarations/{taxDeclaration}/pay */
    public function pay(TaxDeclaration $taxDeclaration): JsonResponse
    {
        $this->authorize($taxDeclaration);

        $taxDeclaration->update([
            'status'  => 'pagada',
            'paid_at' => now(),
        ]);

        return response()->json(['data' => $taxDeclaration->fresh()->append(['type_label', 'period_label'])]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function getPeriodDates(string $type, int $year, int $period): array
    {
        return match ($type) {
            'mensual' => [
                Carbon::create($year, $period, 1)->startOfMonth()->toDateString(),
                Carbon::create($year, $period, 1)->endOfMonth()->toDateString(),
            ],
            'bimestral' => [
                Carbon::create($year, ($period - 1) * 2 + 1, 1)->startOfMonth()->toDateString(),
                Carbon::create($year, min($period * 2, 12), 1)->endOfMonth()->toDateString(),
            ],
            'cuatrimestral' => [
                Carbon::create($year, ($period - 1) * 4 + 1, 1)->startOfMonth()->toDateString(),
                Carbon::create($year, min($period * 4, 12), 1)->endOfMonth()->toDateString(),
            ],
            'anual' => [
                Carbon::create($year, 1,  1)->toDateString(),
                Carbon::create($year, 12, 31)->toDateString(),
            ],
            default => throw new \InvalidArgumentException("Tipo de período inválido: {$type}"),
        };
    }

    private function authorize(TaxDeclaration $declaration): void
    {
        abort_if($declaration->company_id !== (auth()->user()->company_id ?? 1), 403);
    }
}
