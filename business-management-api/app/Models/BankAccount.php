<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankAccount extends Model
{
    use SoftDeletes;

    const TYPES = [
        'corriente'       => 'Cuenta Corriente',
        'ahorros'         => 'Cuenta de Ahorros',
        'caja_menor'      => 'Caja Menor',
        'fondo_fijo'      => 'Fondo Fijo',
        'tarjeta_credito' => 'Tarjeta de Crédito',
    ];

    protected $fillable = [
        'company_id', 'name', 'account_number', 'type', 'bank_name',
        'currency', 'initial_balance', 'current_balance',
        'initial_balance_date', 'puc_account_id', 'is_active', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'initial_balance'      => 'decimal:2',
            'current_balance'      => 'decimal:2',
            'initial_balance_date' => 'date',
            'is_active'            => 'boolean',
        ];
    }

    // ── Relaciones ───────────────────────────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function pucAccount(): BelongsTo
    {
        return $this->belongsTo(PucAccount::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(TreasuryMovement::class);
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(TreasuryMovement::class, 'destination_account_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getTypeLabelAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    public function getIsCashAttribute(): bool
    {
        return in_array($this->type, ['caja_menor', 'fondo_fijo']);
    }
}
