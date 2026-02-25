<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\Auditable;
use App\Traits\BelongsToCompany;

class Employee extends Model
{
    use Auditable, BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id', 'code', 'first_name', 'last_name',
        'document_type', 'document_number', 'email', 'phone', 'birth_date',
        'hire_date', 'termination_date', 'contract_type', 'position', 'department',
        'base_salary', 'has_transport_allowance',
        'eps_name', 'afp_name', 'arl_name', 'arl_risk_level', 'compensation_fund',
        'bank_name', 'bank_account_number', 'bank_account_type',
        'status', 'notes',
    ];

    protected $casts = [
        'birth_date'            => 'date',
        'hire_date'             => 'date',
        'termination_date'      => 'date',
        'base_salary'           => 'decimal:2',
        'has_transport_allowance' => 'boolean',
        'arl_risk_level'        => 'integer',
    ];

    // ── Relaciones ────────────────────────────────────────────────────────────
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────
    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function getYearsOfServiceAttribute(): float
    {
        $end = $this->termination_date ?? now();
        return round($this->hire_date->diffInDays($end) / 365, 2);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────
    public function scopeActive($query)
    {
        return $query->where('status', 'activo');
    }
}
