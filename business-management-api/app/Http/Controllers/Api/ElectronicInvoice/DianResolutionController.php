<?php

namespace App\Http\Controllers\Api\ElectronicInvoice;

use App\Http\Controllers\Controller;
use App\Models\DianResolution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DianResolutionController extends Controller
{
    /** GET /api/dian/resolutions */
    public function index(Request $request): JsonResponse
    {
        $query = DianResolution::query()
            ->when($request->get('type'), fn($q, $v) => $q->where('type', $v))
            ->when($request->boolean('active'), fn($q) => $q->active())
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc');

        $resolutions = $query->paginate($request->get('per_page', 15));

        return response()->json($resolutions);
    }

    /** GET /api/dian/resolutions/{id} */
    public function show(DianResolution $resolution): JsonResponse
    {
        return response()->json([
            'data' => array_merge($resolution->toArray(), [
                'remaining'       => $resolution->remaining,
                'usage_percent'   => $resolution->usage_percent,
                'is_valid'        => $resolution->isValid(),
            ]),
        ]);
    }

    /** POST /api/dian/resolutions */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'resolution_number' => 'required|string|max:50',
            'resolution_date'   => 'required|date',
            'prefix'            => 'nullable|string|max:10',
            'type'              => 'required|in:factura_venta,nota_credito,nota_debito',
            'from_number'       => 'required|integer|min:1',
            'to_number'         => 'required|integer|gte:from_number',
            'valid_from'        => 'required|date',
            'valid_to'          => 'required|date|after:valid_from',
            'technical_key'     => 'nullable|string',
            'environment'       => 'required|in:habilitacion,produccion',
            'notes'             => 'nullable|string|max:500',
            'is_active'         => 'boolean',
        ]);

        // Si se marca como activa, desactivar las demás del mismo tipo
        if ($validated['is_active'] ?? false) {
            DianResolution::where('type', $validated['type'])->update(['is_active' => false]);
        }

        $resolution = DianResolution::create(array_merge($validated, [
            'current_number' => $validated['from_number'] - 1,
        ]));

        return response()->json(['data' => $resolution], 201);
    }

    /** PUT /api/dian/resolutions/{id} */
    public function update(Request $request, DianResolution $resolution): JsonResponse
    {
        $validated = $request->validate([
            'resolution_number' => 'sometimes|string|max:50',
            'resolution_date'   => 'sometimes|date',
            'prefix'            => 'nullable|string|max:10',
            'type'              => 'sometimes|in:factura_venta,nota_credito,nota_debito',
            'from_number'       => 'sometimes|integer|min:1',
            'to_number'         => 'sometimes|integer',
            'valid_from'        => 'sometimes|date',
            'valid_to'          => 'sometimes|date',
            'technical_key'     => 'nullable|string',
            'environment'       => 'sometimes|in:habilitacion,produccion',
            'notes'             => 'nullable|string|max:500',
            'is_active'         => 'boolean',
        ]);

        // Si se activa esta, desactivar las otras del mismo tipo
        if (($validated['is_active'] ?? null) === true) {
            $type = $validated['type'] ?? $resolution->type;
            DianResolution::where('type', $type)
                ->where('id', '!=', $resolution->id)
                ->update(['is_active' => false]);
        }

        $resolution->update($validated);

        return response()->json(['data' => $resolution->fresh()]);
    }

    /** DELETE /api/dian/resolutions/{id} */
    public function destroy(DianResolution $resolution): JsonResponse
    {
        // No eliminar si ya tiene facturas emitidas
        if ($resolution->invoices()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar una resolución con facturas emitidas.',
            ], 422);
        }

        $resolution->delete();
        return response()->json(null, 204);
    }

    /** POST /api/dian/resolutions/{id}/activate */
    public function activate(DianResolution $resolution): JsonResponse
    {
        DianResolution::where('type', $resolution->type)->update(['is_active' => false]);
        $resolution->update(['is_active' => true]);
        return response()->json(['data' => $resolution->fresh(), 'message' => 'Resolución activada.']);
    }
}
