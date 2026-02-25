<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AccountReceivable extends Model
{
    use SoftDeletes;

    const STATUSES = [
        'pendiente' => 'Pendiente',
        'parcial'   => 'Parcial',
        'pagado'    => 'Pagado',
        'vencido'   => 'Vencido',
        'anulado'   => 'Anulado',
    ];

    protected $fillable = [
        'company_id', 'invoice_id', 'third_party_id',
        'document_number', 'issue_date', 'due_date',
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

    // ── Relaciones ───────────────────────────────────────────────────────────

    public function company(): BelongsTo   { return $this->belongsTo(Company::class); }
    public function invoice(): BelongsTo   { return $this->belongsTo(ElectronicInvoice::class); }
    public function thirdParty(): BelongsTo { return $this->belongsTo(ThirdParty::class); }
    public function payments(): HasMany    { return $this->hasMany(ArPayment::class); }

    // ── Scopes ───────────────────────────────────────────────────────────────

    public function scopePending($query)   { return $query->whereIn('status', ['pendiente', 'parcial']); }
    public function scopeOverdue($query)   { return $query->where('due_date', '<', now())->whereIn('status', ['pendiente', 'parcial']); }
    public function scopeDueSoon($query, int $days = 7) {
        return $query->whereBetween('due_date', [now(), now()->addDays($days)])
                     ->whereIn('status', ['pendiente', 'parcial']);
    }

    // ── Accessors ────────────────────────────────────────────────────────────

    public function getDaysOverdueAttribute(): int {
        if (!in_array($this->status, ['pendiente', 'parcial'])) return 0;
        return max(0, now()->diffInDays($this->due_date, false) * -1);
    }

    public function getAgingBucketAttribute(): string {
        $days = $this->days_overdue;
        if ($days <= 0)  return 'vigente';
        if ($days <= 30) return '1-30';
        if ($days <= 60) return '31-60';
        if ($days <= 90) return '61-90';
        return '+90';
    }

    // Recalcula pending_amount y actualiza status
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
