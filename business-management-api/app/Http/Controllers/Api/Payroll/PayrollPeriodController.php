<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Services\Payroll\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollPeriodController extends Controller
{
    public function __construct() {}

    private function payroll(int $companyId): PayrollService
    {
        return new PayrollService($companyId);
    }

    /** GET /api/payroll/periods */
    public function index(Request $request): JsonResponse
    {
        $periods = PayrollPeriod::with('createdBy:id,name')
            ->when($request->get('status'), fn($q, $v) => $q->where('status', $v))
            ->orderByDesc('start_date')
            ->paginate($request->get('per_page', 15));

        return response()->json($periods);
    }

    /** GET /api/payroll/periods/{period} */
    public function show(PayrollPeriod $period): JsonResponse
    {
        $period->load(['items.employee', 'createdBy:id,name']);

        return response()->json(['data' => $period]);
    }

    /** POST /api/payroll/periods — Crea período en borrador */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:150',
            'period_type'  => 'required|in:mensual,quincenal',
            'start_date'   => 'required|date',
            'end_date'     => 'required|date|after_or_equal:start_date',
            'payment_date' => 'required|date',
            'notes'        => 'nullable|string|max:500',
        ]);

        $validated['company_id'] = auth()->user()->company_id ?? 1;
        $validated['created_by'] = auth()->id();
        $validated['status']     = 'borrador';

        $period = PayrollPeriod::create($validated);

        return response()->json(['data' => $period], 201);
    }

    /**
     * POST /api/payroll/periods/{period}/calculate
     * Calcula (o recalcula) todos los items del período.
     * Acepta un mapa de extras por empleado.
     */
    public function calculate(Request $request, PayrollPeriod $period): JsonResponse
    {
        if ($period->status === 'pagado') {
            return response()->json(['message' => 'No se puede recalcular un período ya pagado.'], 422);
        }
        if ($period->status === 'anulado') {
            return response()->json(['message' => 'El período está anulado.'], 422);
        }

        $validated = $request->validate([
            'extras'                              => 'nullable|array',
            'extras.*.employee_id'                => 'required|exists:employees,id',
            'extras.*.worked_days'                => 'nullable|numeric|min:0|max:30',
            'extras.*.overtime_diurnal_hours'     => 'nullable|numeric|min:0',
            'extras.*.overtime_nocturnal_hours'   => 'nullable|numeric|min:0',
            'extras.*.overtime_holiday_hours'     => 'nullable|numeric|min:0',
            'extras.*.commissions'                => 'nullable|numeric|min:0',
            'extras.*.bonuses'                    => 'nullable|numeric|min:0',
            'extras.*.other_income'               => 'nullable|numeric|min:0',
            'extras.*.loans_deduction'            => 'nullable|numeric|min:0',
            'extras.*.other_deductions'           => 'nullable|numeric|min:0',
        ]);

        // Convierte el array de extras a un mapa indexado por employee_id
        $extrasMap = [];
        foreach ($validated['extras'] ?? [] as $item) {
            $extrasMap[$item['employee_id']] = $item;
        }

        try {
            $period = $this->payroll($period->company_id)->calculatePeriod($period, $extrasMap);
            return response()->json(['data' => $period->load('items.employee')]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * PATCH /api/payroll/periods/{period}/items/{item}
     * Actualiza los extras de un empleado y recalcula su item.
     */
    public function updateItem(Request $request, PayrollPeriod $period, PayrollItem $item): JsonResponse
    {
        if ($period->status === 'pagado') {
            return response()->json(['message' => 'No se puede editar un período ya pagado.'], 422);
        }

        $validated = $request->validate([
            'worked_days'              => 'nullable|numeric|min:0|max:30',
            'overtime_diurnal_hours'   => 'nullable|numeric|min:0',
            'overtime_nocturnal_hours' => 'nullable|numeric|min:0',
            'overtime_holiday_hours'   => 'nullable|numeric|min:0',
            'commissions'              => 'nullable|numeric|min:0',
            'bonuses'                  => 'nullable|numeric|min:0',
            'other_income'             => 'nullable|numeric|min:0',
            'loans_deduction'          => 'nullable|numeric|min:0',
            'other_deductions'         => 'nullable|numeric|min:0',
        ]);

        $svc  = $this->payroll($period->company_id);
        $item = $svc->calculateEmployeeItem($item->employee, $period, $validated);
        $svc->recalculatePeriodTotals($period);

        return response()->json(['data' => $item->load('employee')]);
    }

    /**
     * POST /api/payroll/periods/{period}/cancel
     */
    public function cancel(PayrollPeriod $period): JsonResponse
    {
        if ($period->status === 'pagado') {
            return response()->json(['message' => 'No se puede anular un período ya pagado.'], 422);
        }

        $period->update(['status' => 'anulado']);

        return response()->json(['data' => $period, 'message' => 'Período anulado.']);
    }

    /**
     * GET /api/payroll/constants
     * Devuelve las constantes de nómina vigentes (SMMLV, tasas, etc.)
     */
    public function constants(): JsonResponse
    {
        $companyId = auth()->user()->company_id ?? 1;
        $setting   = PayrollSetting::activeForCompany($companyId);

        return response()->json([
            'smmlv'               => $setting ? (float) $setting->smmlv               : PayrollService::SMMLV_DEFAULT,
            'transport_allowance' => $setting ? (float) $setting->transport_allowance  : PayrollService::TRANSPORT_ALLOWANCE_DEFAULT,
            'setting_year'        => $setting?->year,
            'arl_rates'           => PayrollService::ARL_RATES,
            'employee_rates' => [
                'health'   => 4.0,
                'pension'  => 4.0,
                'solidarity_fund' => '1% si salario > 4 SMMLV',
            ],
            'employer_rates' => [
                'health'            => 8.5,
                'pension'           => 12.0,
                'sena'              => 2.0,
                'icbf'              => 3.0,
                'compensation_fund' => 4.0,
            ],
        ]);
    }
}
