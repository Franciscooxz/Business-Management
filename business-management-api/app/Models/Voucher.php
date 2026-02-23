<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\BelongsToCompany;
use App\Traits\GeneratesConsecutive;

class Voucher extends Model
{
    use BelongsToCompany, GeneratesConsecutive;

    protected $fillable = [
        'company_id',
        'period_id',
        'voucher_type',
        'consecutive',
        'prefix',
        'full_number',
        'date',
        'description',
        'third_party_id',
        'cost_center_id',
        'currency_id',
        'exchange_rate',
        'source_type',
        'source_id',
        'total_debit',
        'total_credit',
        'status',
        'reversed_by',
        'notes',
        'created_by',
        'posted_by',
        'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'date'          => 'date',
            'posted_at'     => 'datetime',
            'total_debit'   => 'decimal:4',
            'total_credit'  => 'decimal:4',
            'exchange_rate' => 'decimal:6',
        ];
    }

    protected static function getConsecutiveExtraGroupBy(): array
    {
        return ['voucher_type'];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($voucher) {
            if (empty($voucher->full_number)) {
                $prefixes = [
                    'ingreso'      => 'VI',
                    'egreso'       => 'VE',
                    'diario'       => 'VD',
                    'ajuste'       => 'VA',
                    'apertura'     => 'AO',
                    'cierre'       => 'VC',
                    'nota_debito'  => 'ND',
                    'nota_credito' => 'NC',
                ];

                $prefix  = $prefixes[$voucher->voucher_type] ?? 'V';
                $consec  = str_pad($voucher->consecutive ?? 1, 6, '0', STR_PAD_LEFT);
                $voucher->full_number = $prefix.'-'.$consec;
                $voucher->prefix = $prefix;
            }
        });
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(AccountingPeriod::class, 'period_id');
    }

    public function thirdParty(): BelongsTo
    {
        return $this->belongsTo(ThirdParty::class, 'third_party_id');
    }

    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function postedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function reversedVoucher(): BelongsTo
    {
        return $this->belongsTo(Voucher::class, 'reversed_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(VoucherLine::class)->orderBy('line_number');
    }

    public function isPosted(): bool
    {
        return $this->status === 'posted';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isBalanced(): bool
    {
        return abs($this->total_debit - $this->total_credit) <= 0.01;
    }
}
