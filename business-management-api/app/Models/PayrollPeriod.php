<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use Auditable, BelongsToCompany;
    protected $fillable = [
        'company_id', 'name', 'period_type',
        'start_date', 'end_date', 'payment_date',
        'employee_count', 'total_devengado', 'total_deducciones',
        'total_aportes_patronales', 'total_neto', 'status', 'notes', 'created_by',
    ];

    protected $casts = [
        'start_date'               => 'date',
        'end_date'                 => 'date',
        'payment_date'             => 'date',
        'total_devengado'          => 'decimal:2',
        'total_deducciones'        => 'decimal:2',
        'total_aportes_patronales' => 'decimal:2',
        'total_neto'               => 'decimal:2',
        'employee_count'           => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['anulado']);
    }
}
