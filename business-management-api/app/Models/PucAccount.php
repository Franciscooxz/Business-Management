<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\BelongsToCompany;

class PucAccount extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
        'code',
        'name',
        'description',
        'parent_id',
        'level',
        'type',
        'nature',
        'allows_entries',
        'requires_third',
        'requires_cost_center',
        'requires_document',
        'iva_tax_code',
        'rete_fuente_rate',
        'balance_debit',
        'balance_credit',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'allows_entries'       => 'boolean',
            'requires_third'       => 'boolean',
            'requires_cost_center' => 'boolean',
            'requires_document'    => 'boolean',
            'is_active'            => 'boolean',
            'balance_debit'        => 'decimal:4',
            'balance_credit'       => 'decimal:4',
            'rete_fuente_rate'     => 'decimal:4',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(PucAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(PucAccount::class, 'parent_id')->orderBy('code');
    }

    public function voucherLines(): HasMany
    {
        return $this->hasMany(VoucherLine::class, 'account_id');
    }

    public function accountBalances(): HasMany
    {
        return $this->hasMany(AccountBalance::class, 'account_id');
    }

    /**
     * Saldo actual (naturaleza normal).
     */
    public function getBalanceAttribute(): float
    {
        if ($this->nature === 'debito') {
            return $this->balance_debit - $this->balance_credit;
        }

        return $this->balance_credit - $this->balance_debit;
    }

    /**
     * Arbol completo de descendientes (recursivo).
     */
    public function descendants(): HasMany
    {
        return $this->children()->with('descendants');
    }
}
