<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Traits\BelongsToCompany;

class TreasuryMovement extends Model
{
    use BelongsToCompany, SoftDeletes;

    const TYPES = [
        'ingreso'  => 'Ingreso',
        'egreso'   => 'Egreso',
        'traslado' => 'Traslado',
    ];

    const CONCEPTS = [
        'cobro_cliente'      => 'Cobro a Cliente',
        'anticipo_cliente'   => 'Anticipo de Cliente',
        'pago_proveedor'     => 'Pago a Proveedor',
        'anticipo_proveedor' => 'Anticipo a Proveedor',
        'pago_nomina'        => 'Pago de Nómina',
        'pago_impuesto'      => 'Pago de Impuesto',
        'gasto_operativo'    => 'Gasto Operativo',
        'traslado_interno'   => 'Traslado Interno',
        'consignacion'       => 'Consignación',
        'otro_ingreso'       => 'Otro Ingreso',
        'otro_egreso'        => 'Otro Egreso',
    ];

    // Qué conceptos son de tipo ingreso
    const INCOME_CONCEPTS = [
        'cobro_cliente', 'anticipo_cliente', 'consignacion', 'otro_ingreso',
    ];

    protected $fillable = [
        'company_id', 'type', 'concept',
        'bank_account_id', 'destination_account_id',
        'third_party_id', 'source_type', 'source_id', 'reference',
        'amount', 'currency', 'exchange_rate',
        'retention_retefuente', 'retention_reteiva', 'retention_reteica', 'net_amount',
        'movement_date', 'description', 'status',
        'voucher_id', 'is_reconciled', 'reconciled_date', 'bank_reference',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount'               => 'decimal:2',
            'exchange_rate'        => 'decimal:4',
            'retention_retefuente' => 'decimal:2',
            'retention_reteiva'    => 'decimal:2',
            'retention_reteica'    => 'decimal:2',
            'net_amount'           => 'decimal:2',
            'movement_date'        => 'date',
            'reconciled_date'      => 'date',
            'is_reconciled'        => 'boolean',
        ];
    }

    // ── Relaciones ───────────────────────────────────────────────────────────

    public function company(): BelongsTo        { return $this->belongsTo(Company::class); }
    public function bankAccount(): BelongsTo    { return $this->belongsTo(BankAccount::class); }
    public function destinationAccount(): BelongsTo {
        return $this->belongsTo(BankAccount::class, 'destination_account_id');
    }
    public function thirdParty(): BelongsTo     { return $this->belongsTo(ThirdParty::class); }
    public function voucher(): BelongsTo        { return $this->belongsTo(Voucher::class); }
    public function createdBy(): BelongsTo      { return $this->belongsTo(User::class, 'created_by'); }
    public function arPayment(): HasOne         { return $this->hasOne(ArPayment::class); }
    public function apPayment(): HasOne         { return $this->hasOne(ApPayment::class); }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeIncome($query)    { return $query->where('type', 'ingreso'); }
    public function scopeExpense($query)   { return $query->where('type', 'egreso'); }
    public function scopeApplied($query)   { return $query->where('status', 'aplicado'); }
    public function scopeDateRange($query, $from, $to) {
        return $query->whereBetween('movement_date', [$from, $to]);
    }
    public function scopeUnreconciled($query) {
        return $query->where('is_reconciled', false)->where('status', 'aplicado');
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getTypeLabelAttribute(): string    { return self::TYPES[$this->type] ?? $this->type; }
    public function getConceptLabelAttribute(): string { return self::CONCEPTS[$this->concept] ?? $this->concept; }
    public function getTotalRetentionsAttribute(): float {
        return (float)$this->retention_retefuente
             + (float)$this->retention_reteiva
             + (float)$this->retention_reteica;
    }
}
