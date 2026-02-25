<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Models\PayrollSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollSettingController extends Controller
{
    /** GET /api/payroll/settings */
    public function index(): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $settings = PayrollSetting::where('company_id', $companyId)
            ->orderByDesc('year')
            ->get();

        return response()->json(['data' => $settings]);
    }

    /** POST /api/payroll/settings */
    public function store(Request $request): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;

        $validated = $request->validate([
            'year'                => 'required|integer|min:2020|max:2099',
            'smmlv'               => 'required|numeric|min:1',
            'transport_allowance' => 'required|numeric|min:0',
            'is_active'           => 'boolean',
        ]);

        $validated['company_id'] = $companyId;

        $setting = PayrollSetting::updateOrCreate(
            ['company_id' => $companyId, 'year' => $validated['year']],
            $validated
        );

        // Si se marca como activa, desactivar las demás
        if ($setting->is_active) {
            $this->deactivateOthers($companyId, $setting->id);
        }

        return response()->json(['data' => $setting], 201);
    }

    /** PUT /api/payroll/settings/{setting} */
    public function update(Request $request, PayrollSetting $setting): JsonResponse
    {
        $this->authorizeCompany($setting);

        $validated = $request->validate([
            'year'                => 'sometimes|integer|min:2020|max:2099',
            'smmlv'               => 'sometimes|numeric|min:1',
            'transport_allowance' => 'sometimes|numeric|min:0',
            'is_active'           => 'boolean',
        ]);

        $setting->update($validated);

        if ($setting->is_active) {
            $this->deactivateOthers($setting->company_id, $setting->id);
        }

        return response()->json(['data' => $setting->fresh()]);
    }

    /** POST /api/payroll/settings/{setting}/activate */
    public function activate(PayrollSetting $setting): JsonResponse
    {
        $this->authorizeCompany($setting);

        DB::transaction(function () use ($setting) {
            PayrollSetting::where('company_id', $setting->company_id)
                ->where('id', '!=', $setting->id)
                ->update(['is_active' => false]);

            $setting->update(['is_active' => true]);
        });

        return response()->json(['data' => $setting->fresh(), 'message' => "Configuración {$setting->year} activada."]);
    }

    /** DELETE /api/payroll/settings/{setting} */
    public function destroy(PayrollSetting $setting): JsonResponse
    {
        $this->authorizeCompany($setting);

        if ($setting->is_active) {
            return response()->json(['message' => 'No se puede eliminar la configuración activa.'], 422);
        }

        $setting->delete();

        return response()->json(null, 204);
    }

    private function deactivateOthers(int $companyId, int $exceptId): void
    {
        PayrollSetting::where('company_id', $companyId)
            ->where('id', '!=', $exceptId)
            ->update(['is_active' => false]);
    }

    private function authorizeCompany(PayrollSetting $setting): void
    {
        $companyId = auth()->user()->company_id ?? 1;
        abort_if($setting->company_id !== $companyId, 403);
    }
}
