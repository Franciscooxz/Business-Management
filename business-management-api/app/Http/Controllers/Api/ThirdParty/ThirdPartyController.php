<?php

namespace App\Http\Controllers\Api\ThirdParty;

use App\Http\Controllers\Controller;
use App\Models\ThirdParty;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ThirdPartyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ThirdParty::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('document_number', 'like', "%{$search}%")
                  ->orWhere('razon_social', 'ilike', "%{$search}%")
                  ->orWhere('nombre_comercial', 'ilike', "%{$search}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) ilike ?", ["%{$search}%"]);
            });
        }

        if ($request->filled('type')) {
            $type = $request->type;
            if ($type === 'customer') {
                $query->where('is_customer', true);
            } elseif ($type === 'supplier') {
                $query->where('is_supplier', true);
            } elseif ($type === 'employee') {
                $query->where('is_employee', true);
            }
        }

        if ($request->filled('document_type')) {
            $query->where('document_type', $request->document_type);
        }

        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        $perPage = min((int) $request->get('per_page', 20), 100);
        $third_parties = $query->orderBy('razon_social')->orderBy('last_name')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $third_parties,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'document_type'       => 'required|in:NIT,CC,CE,PAS,TE',
            'document_number'     => 'required|string|max:20',
            'dv'                  => 'nullable|string|size:1',
            'first_name'          => 'nullable|string|max:100',
            'last_name'           => 'nullable|string|max:100',
            'razon_social'        => 'nullable|string|max:500',
            'nombre_comercial'    => 'nullable|string|max:255',
            'is_customer'         => 'boolean',
            'is_supplier'         => 'boolean',
            'is_employee'         => 'boolean',
            'persona_type'        => 'required|in:natural,juridica',
            'regimen_tributario'  => 'nullable|in:simplificado,comun,gran_contribuyente',
            'responsable_iva'     => 'boolean',
            'gran_contribuyente'  => 'boolean',
            'autorretenedor'      => 'boolean',
            'declarante_renta'    => 'boolean',
            'actividad_economica' => 'nullable|string|max:10',
            'apply_retefuente'    => 'boolean',
            'apply_reteica'       => 'boolean',
            'apply_reteiva'       => 'boolean',
            'reteica_rate'        => 'nullable|numeric|min:0|max:1',
            'email'               => 'nullable|email',
            'email_fe'            => 'nullable|email',
            'phone'               => 'nullable|string|max:30',
            'mobile'              => 'nullable|string|max:30',
            'address'             => 'nullable|string',
            'city'                => 'nullable|string|max:100',
            'department'          => 'nullable|string|max:100',
            'postal_code'         => 'nullable|string|max:10',
            'country'             => 'nullable|string|max:10',
        ]);

        $data['created_by'] = $request->user()->id;

        $third = ThirdParty::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Tercero creado exitosamente.',
            'data'    => $third,
        ], 201);
    }

    public function show(ThirdParty $thirdParty): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => $thirdParty,
        ]);
    }

    public function update(Request $request, ThirdParty $thirdParty): JsonResponse
    {
        $data = $request->validate([
            'first_name'          => 'nullable|string|max:100',
            'last_name'           => 'nullable|string|max:100',
            'razon_social'        => 'nullable|string|max:500',
            'nombre_comercial'    => 'nullable|string|max:255',
            'is_customer'         => 'boolean',
            'is_supplier'         => 'boolean',
            'is_employee'         => 'boolean',
            'persona_type'        => 'in:natural,juridica',
            'regimen_tributario'  => 'nullable|in:simplificado,comun,gran_contribuyente',
            'responsable_iva'     => 'boolean',
            'gran_contribuyente'  => 'boolean',
            'autorretenedor'      => 'boolean',
            'declarante_renta'    => 'boolean',
            'actividad_economica' => 'nullable|string|max:10',
            'apply_retefuente'    => 'boolean',
            'apply_reteica'       => 'boolean',
            'apply_reteiva'       => 'boolean',
            'reteica_rate'        => 'nullable|numeric|min:0|max:1',
            'email'               => 'nullable|email',
            'email_fe'            => 'nullable|email',
            'phone'               => 'nullable|string|max:30',
            'mobile'              => 'nullable|string|max:30',
            'address'             => 'nullable|string',
            'city'                => 'nullable|string|max:100',
            'department'          => 'nullable|string|max:100',
            'postal_code'         => 'nullable|string|max:10',
            'is_active'           => 'boolean',
        ]);

        $thirdParty->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Tercero actualizado.',
            'data'    => $thirdParty,
        ]);
    }

    public function destroy(ThirdParty $thirdParty): JsonResponse
    {
        $thirdParty->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tercero eliminado.',
        ]);
    }

    /**
     * Busqueda rapida para selectores/dropdowns.
     */
    public function search(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        $results = ThirdParty::where('is_active', true)
            ->where(function ($query) use ($q) {
                $query->where('document_number', 'like', "%{$q}%")
                      ->orWhere('razon_social', 'ilike', "%{$q}%")
                      ->orWhere('nombre_comercial', 'ilike', "%{$q}%")
                      ->orWhereRaw("CONCAT(first_name, ' ', last_name) ilike ?", ["%{$q}%"]);
            })
            ->limit(15)
            ->get(['id', 'document_type', 'document_number', 'dv', 'razon_social', 'first_name', 'last_name', 'persona_type', 'email', 'email_fe']);

        return response()->json([
            'success' => true,
            'data'    => $results,
        ]);
    }
}
