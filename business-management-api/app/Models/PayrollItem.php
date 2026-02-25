<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollItem extends Model
{
    protected $fillable = [
        'company_id', 'payroll_period_id', 'employee_id',
        'worked_days', 'ibc',
        'basic_salary', 'transport_allowance',
        'overtime_diurnal', 'overtime_nocturnal', 'overtime_holiday',
        'commissions', 'bonuses', 'other_income', 'total_devengado',
        'health_employee', 'pension_employee', 'solidarity_fund',
        'loans_deduction', 'other_deductions', 'total_deducciones',
        'net_pay',
        'health_employer', 'pension_employer', 'arl', 'sena', 'icbf',
        'compensation_fund', 'total_aportes_patronales',
    ];

    protected $casts = [
        'worked_days'              => 'decimal:2',
        'ibc'                      => 'decimal:2',
        'basic_salary'             => 'decimal:2',
        'transport_allowance'      => 'decimal:2',
        'overtime_diurnal'         => 'decimal:2',
        'overtime_nocturnal'       => 'decimal:2',
        'overtime_holiday'         => 'decimal:2',
        'commissions'              => 'decimal:2',
        'bonuses'                  => 'decimal:2',
        'other_income'             => 'decimal:2',
        'total_devengado'          => 'decimal:2',
        'health_employee'          => 'decimal:2',
        'pension_employee'         => 'decimal:2',
        'solidarity_fund'          => 'decimal:2',
        'loans_deduction'          => 'decimal:2',
        'other_deductions'         => 'decimal:2',
        'total_deducciones'        => 'decimal:2',
        'net_pay'                  => 'decimal:2',
        'health_employer'          => 'decimal:2',
        'pension_employer'         => 'decimal:2',
        'arl'                      => 'decimal:2',
        'sena'                     => 'decimal:2',
        'icbf'                     => 'decimal:2',
        'compensation_fund'        => 'decimal:2',
        'total_aportes_patronales' => 'decimal:2',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class, 'payroll_period_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
