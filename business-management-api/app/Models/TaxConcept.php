<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxConcept extends Model
{
    protected $fillable = [
        'company_id',
        'code',
        'name',
        'type',
        'rate',
        'minimum_base',
        'applies_to',
        'account_code',
        'is_active',
    ];

    protected $casts = [
        'rate'         => 'decimal:4',
        'minimum_base' => 'decimal:2',
        'is_active'    => 'boolean',
    ];

    const TYPE_LABELS = [
        'retefuente' => 'Retención en la Fuente',
        'reteica'    => 'Retención ICA',
        'iva'        => 'IVA',
        'reteiva'    => 'Retención IVA',
        'ica'        => 'ICA',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(WithholdingEntry::class);
    }

    /**
     * Calcula el valor de retención para una base dada.
     * Retorna 0 si la base no supera el mínimo gravable.
     */
    public function calculate(float $baseAmount): float
    {
        if ($baseAmount < (float) $this->minimum_base) {
            return 0.0;
        }

        return round($baseAmount * ((float) $this->rate / 100), 2);
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPE_LABELS[$this->type] ?? $this->type;
    }
}
