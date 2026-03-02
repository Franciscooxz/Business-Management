<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountPayable extends Model
{
    use SoftDeletes;

    protected $table = 'accounts_payable';

    const STATUSES = [
        'pendiente' => 'Pendiente',
        'parcial'   => 'Parcial',
        'pagado'    => 'Pagado',
        'vencido'   => 'Vencido',
        'anulado'   => 'Anulado',
    ];

    protected $fillable = [
        'company_id', 'purchase_order_id', 'third_party_id',
        'supplier_invoice', 'issue_date', 'due_date',
        'total_amount', 'paid_amount', 'pending_amount',
        'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'     => 'date',
            'due_date'       => 'date',
            'total_amount'   => 'decimal:2',
            'paid_amount'    => 'decimal:2',
            'pending_amount' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo     { return $this->belongsTo(Company::class); }
    public function purchaseOrder(): BelongsTo { return $this->belongsTo(PurchaseOrder::class); }
    public function thirdParty(): BelongsTo  { return $this->belongsTo(ThirdParty::class); }
    public function payments(): HasMany      { return $this->hasMany(ApPayment::class); }

    public function scopePending($query)  { return $query->whereIn('status', ['pendiente', 'parcial']); }
    public function scopeOverdue($query)  { return $query->where('due_date', '<', now())->whereIn('status', ['pendiente', 'parcial']); }

    public function getDaysOverdueAttribute(): int {
        if (!in_array($this->status, ['pendiente', 'parcial'])) return 0;
        return max(0, now()->diffInDays($this->due_date, false) * -1);
    }

    public function recalculate(): void {
        $this->pending_amount = $this->total_amount - $this->paid_amount;
        if ($this->pending_amount <= 0) {
            $this->status = 'pagado';
        } elseif ($this->paid_amount > 0) {
            $this->status = 'parcial';
        } elseif ($this->due_date->isPast()) {
            $this->status = 'vencido';
        } else {
            $this->status = 'pendiente';
        }
        $this->save();
    }
}
