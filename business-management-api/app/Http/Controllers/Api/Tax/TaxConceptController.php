<?php

namespace App\Http\Controllers\Api\Tax;

use App\Http\Controllers\Controller;
use App\Models\TaxConcept;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxConceptController extends Controller
{
    /** GET /api/taxes/concepts */
    public function index(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $query = TaxConcept::where('company_id', $companyId);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('applies_to')) {
            $query->where('applies_to', $request->applies_to);
        }

        // Por defecto solo activos; pasar active_only=false para ver todos
        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        $concepts = $query->orderBy('type')->orderBy('code')->get()
            ->append('type_label');

        return response()->json(['data' => $concepts]);
    }

    /** POST /api/taxes/concepts */
    public function store(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $validated = $request->validate([
            'code'         => 'required|string|max:10',
            'name'         => 'required|string|max:150',
            'type'         => 'required|in:retefuente,reteica,iva,reteiva,ica',
            'rate'         => 'required|numeric|min:0|max:100',
            'minimum_base' => 'sometimes|numeric|min:0',
            'applies_to'   => 'sometimes|in:purchase,sale,both',
            'account_code' => 'nullable|string|max:20',
            'is_active'    => 'sometimes|boolean',
        ]);

        $validated['company_id'] = $companyId;

        $concept = TaxConcept::create($validated);

        return response()->json(['data' => $concept->append('type_label')], 201);
    }

    /** PUT /api/taxes/concepts/{taxConcept} */
    public function update(Request $request, TaxConcept $taxConcept): JsonResponse
    {
        $this->authorizeCompany($taxConcept);

        $validated = $request->validate([
            'code'         => 'sometimes|string|max:10',
            'name'         => 'sometimes|string|max:150',
            'type'         => 'sometimes|in:retefuente,reteica,iva,reteiva,ica',
            'rate'         => 'sometimes|numeric|min:0|max:100',
            'minimum_base' => 'sometimes|numeric|min:0',
            'applies_to'   => 'sometimes|in:purchase,sale,both',
            'account_code' => 'nullable|string|max:20',
            'is_active'    => 'sometimes|boolean',
        ]);

        $taxConcept->update($validated);

        return response()->json(['data' => $taxConcept->fresh()->append('type_label')]);
    }

    /** DELETE /api/taxes/concepts/{taxConcept} */
    public function destroy(TaxConcept $taxConcept): JsonResponse
    {
        $this->authorizeCompany($taxConcept);

        $taxConcept->delete();

        return response()->json(null, 204);
    }

    private function authorizeCompany(TaxConcept $concept): void
    {
        abort_if($concept->company_id !== (auth()->user()->company_id ?? 1), 403);
    }
}
