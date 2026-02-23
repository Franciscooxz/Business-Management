<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountBalance extends Model
{
    protected $fillable = [
        'company_id',
        'account_id',
        'period_id',
        'opening_debit',
        'opening_credit',
        'period_debit',
        'period_credit',
        'closing_debit',
        'closing_credit',
    ];

    protected function casts(): array
    {
        return [
            'opening_debit'  => 'decimal:4',
            'opening_credit' => 'decimal:4',
            'period_debit'   => 'decimal:4',
            'period_credit'  => 'decimal:4',
            'closing_debit'  => 'decimal:4',
            'closing_credit' => 'decimal:4',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(PucAccount::class, 'account_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
