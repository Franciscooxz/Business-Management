<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArPayment extends Model
{
    protected $fillable = [
        'company_id', 'accounts_receivable_id', 'treasury_movement_id',
        'amount', 'payment_date', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function accountReceivable(): BelongsTo {
        return $this->belongsTo(AccountReceivable::class);
    }
    public function treasuryMovement(): BelongsTo {
        return $this->belongsTo(TreasuryMovement::class);
    }
}
