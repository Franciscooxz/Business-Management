<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxDeclaration extends Model
{
    protected $fillable = [
        'company_id',
        'created_by',
        'type',
        'period_type',
        'year',
        'period_number',
        'start_date',
        'end_date',
        'total_base',
        'total_tax_generated',
        'total_tax_discountable',
        'previous_balance_favor',
        'saldo_pagar',
        'saldo_favor',
        'status',
        'notes',
        'presented_at',
        'paid_at',
    ];

    protected $casts = [
        'year'                    => 'integer',
        'period_number'           => 'integer',
        'start_date'              => 'date',
        'end_date'                => 'date',
        'total_base'              => 'decimal:2',
        'total_tax_generated'     => 'decimal:2',
        'total_tax_discountable'  => 'decimal:2',
        'previous_balance_favor'  => 'decimal:2',
        'saldo_pagar'             => 'decimal:2',
        'saldo_favor'             => 'decimal:2',
        'presented_at'            => 'datetime',
        'paid_at'                 => 'datetime',
    ];

    const TYPE_LABELS = [
        'iva'        => 'IVA',
        'retefuente' => 'Retención en la Fuente',
        'reteica'    => 'Retención ICA',
        'ica'        => 'ICA',
        'renta'      => 'Renta',
    ];

    const STATUS_COLORS = [
        'borrador'   => 'gray',
        'presentada' => 'blue',
        'pagada'     => 'green',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(WithholdingEntry::class);
    }

    public function getTypeLabelAttribute(): string
    {
        return self::TYPE_LABELS[$this->type] ?? $this->type;
    }

    public function getPeriodLabelAttribute(): string
    {
        return match ($this->period_type) {
            'mensual'       => "Mes {$this->period_number} / {$this->year}",
            'bimestral'     => "Bimestre {$this->period_number} / {$this->year}",
            'cuatrimestral' => "Cuatrimestre {$this->period_number} / {$this->year}",
            'anual'         => "Año {$this->year}",
            default         => "{$this->period_number}/{$this->year}",
        };
    }
}
