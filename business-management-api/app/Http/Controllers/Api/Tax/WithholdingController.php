<?php

namespace App\Http\Controllers\Api\Tax;

use App\Http\Controllers\Controller;
use App\Models\TaxConcept;
use App\Models\WithholdingEntry;
use App\Services\Tax\WithholdingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithholdingController extends Controller
{
    public function __construct(private readonly WithholdingService $service) {}

    /** GET /api/taxes/withholding */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $query = WithholdingEntry::with('concept', 'thirdParty')
            ->where('company_id', $companyId);

        if ($request->filled('direction'))      { $query->where('direction', $request->direction); }
        if ($request->filled('start_date'))     { $query->where('document_date', '>=', $request->start_date); }
        if ($request->filled('end_date'))       { $query->where('document_date', '<=', $request->end_date); }
        if ($request->filled('third_party_id')) { $query->where('third_party_id', $request->third_party_id); }
        if ($request->filled('type')) {
            $query->whereHas('concept', fn ($q) => $q->where('type', $request->type));
        }

        $paginator = $query->orderByDesc('document_date')
            ->paginate($request->integer('per_page', 50));

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

    /** POST /api/taxes/withholding */
    public function store(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'tax_concept_id'  => 'required|exists:tax_concepts,id',
            'third_party_id'  => 'nullable|integer',
            'document_number' => 'nullable|string|max:50',
            'document_date'   => 'required|date',
            'base_amount'     => 'required|numeric|min:0',
            'direction'       => 'required|in:practicada,sufrida',
            'reference'       => 'nullable|string|max:100',
            'notes'           => 'nullable|string',
        ]);

        $validated['company_id'] = $companyId;

        $entry = $this->service->createEntry($validated);
        $entry->load('concept', 'thirdParty');

        return response()->json(['data' => $entry], 201);
    }

    /** PUT /api/taxes/withholding/{withholdingEntry} */
    public function update(Request $request, WithholdingEntry $withholdingEntry): JsonResponse
    {
        abort_if($withholdingEntry->company_id !== (auth()->user()->company_id), 403);

        $validated = $request->validate([
            'tax_concept_id'  => 'sometimes|exists:tax_concepts,id',
            'third_party_id'  => 'nullable|integer',
            'document_number' => 'nullable|string|max:50',
            'document_date'   => 'sometimes|date',
            'base_amount'     => 'sometimes|numeric|min:0',
            'direction'       => 'sometimes|in:practicada,sufrida',
            'reference'       => 'nullable|string|max:100',
            'notes'           => 'nullable|string',
        ]);

        // Recalcular el impuesto si cambia la base o el concepto
        if (isset($validated['base_amount']) || isset($validated['tax_concept_id'])) {
            $concept = TaxConcept::find($validated['tax_concept_id'] ?? $withholdingEntry->tax_concept_id);
            $base    = (float) ($validated['base_amount'] ?? $withholdingEntry->base_amount);

            $validated['rate']       = $concept->rate;
            $validated['tax_amount'] = $concept->calculate($base);
        }

        $withholdingEntry->update($validated);

        return response()->json([
            'data' => $withholdingEntry->fresh()->load('concept', 'thirdParty'),
        ]);
    }

    /** DELETE /api/taxes/withholding/{withholdingEntry} */
    public function destroy(WithholdingEntry $withholdingEntry): JsonResponse
    {
        abort_if($withholdingEntry->company_id !== (auth()->user()->company_id), 403);

        $withholdingEntry->delete();

        return response()->json(null, 204);
    }

    /**
     * GET /api/taxes/withholding/summary
     * Resumen agrupado por concepto para construcción de declaraciones.
     */
    public function summary(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'type'       => 'sometimes|in:retefuente,reteica,iva,reteiva,ica',
        ]);

        $type    = $validated['type'] ?? 'retefuente';
        $summary = $this->service->getSummaryForPeriod(
            $companyId,
            $validated['start_date'],
            $validated['end_date'],
            $type
        );

        return response()->json(['data' => $summary]);
    }

    /**
     * GET /api/taxes/withholding/certificate/{thirdPartyId}
     * Certificado de retenciones practicadas a un tercero en el año.
     */
    public function certificate(Request $request, int $thirdPartyId): JsonResponse
    {
        $companyId = auth()->user()->company_id;
        $year      = $request->integer('year', now()->year);

        $entries = WithholdingEntry::with('concept')
            ->where('company_id', $companyId)
            ->where('third_party_id', $thirdPartyId)
            ->where('direction', 'practicada')
            ->whereYear('document_date', $year)
            ->orderBy('document_date')
            ->get();

        $grouped = $entries->groupBy('tax_concept_id')->map(fn ($items) => [
            'concept_code' => $items->first()->concept?->code,
            'concept_name' => $items->first()->concept?->name,
            'rate'         => $items->first()->concept?->rate,
            'total_base'   => round($items->sum('base_amount'), 2),
            'total_tax'    => round($items->sum('tax_amount'),  2),
            'entry_count'  => $items->count(),
        ])->values();

        return response()->json([
            'data' => [
                'year'           => $year,
                'third_party_id' => $thirdPartyId,
                'concepts'       => $grouped,
                'total_base'     => round($entries->sum('base_amount'), 2),
                'total_tax'      => round($entries->sum('tax_amount'),  2),
            ],
        ]);
    }

    /**
     * GET /api/taxes/withholding/exogenous
     * Generador de Información Exógena DIAN — agrupado por NIT y concepto.
     */
    public function exogenous(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id;
        $year      = $request->integer('year', now()->year);
        $type      = $request->get('type', 'retefuente');

        $rows = WithholdingEntry::with('concept', 'thirdParty')
            ->where('company_id', $companyId)
            ->where('direction', 'practicada')
            ->whereYear('document_date', $year)
            ->whereHas('concept', fn ($q) => $q->where('type', $type))
            ->orderBy('document_date')
            ->get();

        $grouped = $rows
            ->groupBy(fn ($e) => $e->tax_concept_id . '|' . ($e->third_party_id ?? 'SIN'))
            ->map(fn ($items) => [
                'year'             => $year,
                'concept_code'     => $items->first()->concept?->code         ?? '',
                'concept_name'     => $items->first()->concept?->name         ?? '',
                'nit'              => $items->first()->thirdParty?->document_number ?? 'SIN NIT',
                'name'             => $items->first()->thirdParty?->name
                                   ?? $items->first()->thirdParty?->company_name
                                   ?? 'N/A',
                'person_type'      => $items->first()->thirdParty?->person_type     ?? 'juridica',
                'total_base'       => round($items->sum('base_amount'), 2),
                'total_tax'        => round($items->sum('tax_amount'),  2),
                'entry_count'      => $items->count(),
            ])
            ->values();

        return response()->json([
            'data' => $grouped,
            'year' => $year,
            'type' => $type,
        ]);
    }
}
