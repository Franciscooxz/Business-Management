<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoucherLine extends Model
{
    protected $fillable = [
        'voucher_id',
        'line_number',
        'account_id',
        'third_party_id',
        'cost_center_id',
        'description',
        'debit',
        'credit',
        'tax_base',
        'tax_rate',
        'tax_type',
    ];

    protected function casts(): array
    {
        return [
            'debit'    => 'decimal:4',
            'credit'   => 'decimal:4',
            'tax_base' => 'decimal:4',
            'tax_rate' => 'decimal:4',
        ];
    }

    public function voucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(PucAccount::class, 'account_id');
    }

    public function thirdParty(): BelongsTo
    {
        return $this->belongsTo(ThirdParty::class, 'third_party_id');
    }

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }
}
