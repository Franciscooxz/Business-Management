<?php

namespace App\Services\Payroll;

use App\Models\Employee;
use App\Models\PayrollItem;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use Illuminate\Support\Facades\DB;

class PayrollService
{
    // ── Fallbacks (si no hay configuración en BD) ─────────────────────────────
    const SMMLV_DEFAULT              = 1_423_500;
    const TRANSPORT_ALLOWANCE_DEFAULT = 202_000;
    const SMMLV_TRANSPORT_LIMIT       = 2; // hasta 2 SMMLV tiene derecho a auxilio

    // Tasas ARL por nivel de riesgo (Decreto 1607/2002)
    const ARL_RATES = [
        1 => 0.00522,  // 0.522%
        2 => 0.01044,  // 1.044%
        3 => 0.02436,  // 2.436%
        4 => 0.04350,  // 4.350%
        5 => 0.06960,  // 6.960%
    ];

    // ── Valores dinámicos por empresa (se cachean por instancia) ──────────────
    private float $smmlv;
    private float $transportAllowance;

    public function __construct(int $companyId = 1)
    {
        $setting = PayrollSetting::activeForCompany($companyId);

        $this->smmlv              = $setting ? (float) $setting->smmlv              : self::SMMLV_DEFAULT;
        $this->transportAllowance = $setting ? (float) $setting->transport_allowance : self::TRANSPORT_ALLOWANCE_DEFAULT;
    }

    /**
     * Calcula todos los items de un período para los empleados activos.
     * Crea o actualiza un PayrollItem por empleado.
     */
    public function calculatePeriod(PayrollPeriod $period, array $extrasMap = []): PayrollPeriod
    {
        DB::transaction(function () use ($period, $extrasMap) {
            $employees = Employee::where('company_id', $period->company_id)
                ->where('status', 'activo')
                ->get();

            foreach ($employees as $employee) {
                $extras = $extrasMap[$employee->id] ?? [];
                $this->calculateEmployeeItem($employee, $period, $extras);
            }

            $this->recalculatePeriodTotals($period);
        });

        return $period->fresh();
    }

    /**
     * Calcula / recalcula el PayrollItem de un empleado en un período.
     */
    public function calculateEmployeeItem(
        Employee $employee,
        PayrollPeriod $period,
        array $extras = []
    ): PayrollItem {
        $smmlv              = $this->smmlv;
        $transportAllowance = $this->transportAllowance;

        $workedDays  = (float) ($extras['worked_days'] ?? 30);
        $dailySalary = $employee->base_salary / 30;

        // ── Devengados ────────────────────────────────────────────────────────
        $basicSalary = round($dailySalary * $workedDays, 2);

        // Auxilio de transporte: solo si salario ≤ 2 SMMLV y días trabajados > 0
        $transportAux = 0;
        if ($employee->base_salary <= self::SMMLV_TRANSPORT_LIMIT * $smmlv && $workedDays > 0) {
            $transportAux = round($transportAllowance * $workedDays / 30, 2);
        }

        // Horas extra
        $hourlyRate        = $dailySalary / 8;
        $overtimeDiurnal   = round(($extras['overtime_diurnal_hours']  ?? 0) * $hourlyRate * 1.25, 2);
        $overtimeNocturnal = round(($extras['overtime_nocturnal_hours'] ?? 0) * $hourlyRate * 1.75, 2);
        $overtimeHoliday   = round(($extras['overtime_holiday_hours']  ?? 0) * $hourlyRate * 2.00, 2);

        $commissions  = (float) ($extras['commissions']  ?? 0);
        $bonuses      = (float) ($extras['bonuses']      ?? 0);
        $otherIncome  = (float) ($extras['other_income'] ?? 0);

        $totalDevengado = $basicSalary + $transportAux + $overtimeDiurnal
                        + $overtimeNocturnal + $overtimeHoliday + $commissions
                        + $bonuses + $otherIncome;

        // ── IBC (Ingreso Base de Cotización) ──────────────────────────────────
        // Incluye salario + HE + comisiones (NO transporte ni bonificaciones no habituales)
        $ibc    = $basicSalary + $overtimeDiurnal + $overtimeNocturnal + $overtimeHoliday + $commissions;
        $ibcMin = $smmlv * $workedDays / 30;
        $ibc    = max($ibcMin, min($ibc, 25 * $smmlv));
        $ibc    = round($ibc, 2);

        // ── Deducciones del empleado ──────────────────────────────────────────
        $healthEmployee  = round($ibc * 0.04, 2);  // 4%
        $pensionEmployee = round($ibc * 0.04, 2);  // 4%
        // Fondo de solidaridad: 1% si salario > 4 SMMLV
        $solidarityFund  = ($employee->base_salary >= 4 * $smmlv)
                         ? round($ibc * 0.01, 2) : 0;

        $loansDeduction  = (float) ($extras['loans_deduction']  ?? 0);
        $otherDeductions = (float) ($extras['other_deductions'] ?? 0);

        $totalDeducciones = $healthEmployee + $pensionEmployee + $solidarityFund
                          + $loansDeduction + $otherDeductions;

        $netPay = round($totalDevengado - $totalDeducciones, 2);

        // ── Aportes patronales ────────────────────────────────────────────────
        $healthEmployer   = round($ibc * 0.085, 2);  // 8.5%
        $pensionEmployer  = round($ibc * 0.12,  2);  // 12%
        $arlRate          = self::ARL_RATES[$employee->arl_risk_level] ?? self::ARL_RATES[1];
        $arl              = round($ibc * $arlRate, 2);
        $sena             = round($ibc * 0.02, 2);   // 2%
        $icbf             = round($ibc * 0.03, 2);   // 3%
        $compensationFund = round($ibc * 0.04, 2);   // 4%

        $totalAportesPatronales = $healthEmployer + $pensionEmployer + $arl
                                + $sena + $icbf + $compensationFund;

        return PayrollItem::updateOrCreate(
            [
                'payroll_period_id' => $period->id,
                'employee_id'       => $employee->id,
            ],
            [
                'company_id'               => $period->company_id,
                'worked_days'              => $workedDays,
                'ibc'                      => $ibc,
                'basic_salary'             => $basicSalary,
                'transport_allowance'      => $transportAux,
                'overtime_diurnal'         => $overtimeDiurnal,
                'overtime_nocturnal'       => $overtimeNocturnal,
                'overtime_holiday'         => $overtimeHoliday,
                'commissions'              => $commissions,
                'bonuses'                  => $bonuses,
                'other_income'             => $otherIncome,
                'total_devengado'          => $totalDevengado,
                'health_employee'          => $healthEmployee,
                'pension_employee'         => $pensionEmployee,
                'solidarity_fund'          => $solidarityFund,
                'loans_deduction'          => $loansDeduction,
                'other_deductions'         => $otherDeductions,
                'total_deducciones'        => $totalDeducciones,
                'net_pay'                  => $netPay,
                'health_employer'          => $healthEmployer,
                'pension_employer'         => $pensionEmployer,
                'arl'                      => $arl,
                'sena'                     => $sena,
                'icbf'                     => $icbf,
                'compensation_fund'        => $compensationFund,
                'total_aportes_patronales' => $totalAportesPatronales,
            ]
        );
    }

    /**
     * Recalcula los totales del período desde sus items.
     */
    public function recalculatePeriodTotals(PayrollPeriod $period): void
    {
        $totals = PayrollItem::where('payroll_period_id', $period->id)
            ->selectRaw('
                COUNT(*) as employee_count,
                SUM(total_devengado) as total_devengado,
                SUM(total_deducciones) as total_deducciones,
                SUM(total_aportes_patronales) as total_aportes_patronales,
                SUM(net_pay) as total_neto
            ')
            ->first();

        $period->update([
            'employee_count'           => $totals->employee_count,
            'total_devengado'          => $totals->total_devengado ?? 0,
            'total_deducciones'        => $totals->total_deducciones ?? 0,
            'total_aportes_patronales' => $totals->total_aportes_patronales ?? 0,
            'total_neto'               => $totals->total_neto ?? 0,
            'status'                   => 'calculado',
        ]);
    }

    /**
     * Calcula las prestaciones sociales acumuladas de un empleado.
     */
    public function getSocialBenefits(Employee $employee): array
    {
        $yearsOfService = $employee->years_of_service;
        $monthlySalary  = $employee->base_salary;

        $severance         = round($monthlySalary * $yearsOfService, 2);
        $severanceInterest = round($severance * 0.12 * min($yearsOfService, 1), 2);
        $serviceBonus      = round($monthlySalary * $yearsOfService, 2);
        $vacations         = round($monthlySalary * 0.5 * $yearsOfService, 2);

        return [
            'years_of_service'   => $yearsOfService,
            'severance'          => $severance,
            'severance_interest' => $severanceInterest,
            'service_bonus'      => $serviceBonus,
            'vacations'          => $vacations,
            'total'              => $severance + $severanceInterest + $serviceBonus + $vacations,
        ];
    }
}
