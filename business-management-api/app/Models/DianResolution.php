<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DianResolution extends Model
{
    protected $fillable = [
        'company_id', 'resolution_number', 'resolution_date', 'prefix', 'type',
        'from_number', 'to_number', 'current_number',
        'valid_from', 'valid_to', 'is_active', 'technical_key', 'environment', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'resolution_date' => 'date',
            'valid_from'      => 'date',
            'valid_to'        => 'date',
            'is_active'       => 'boolean',
            'from_number'     => 'integer',
            'to_number'       => 'integer',
            'current_number'  => 'integer',
        ];
    }

    // ── Relaciones ──────────────────────────────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(ElectronicInvoice::class, 'resolution_id');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    /** Verifica si la resolución está vigente */
    public function isValid(): bool
    {
        return $this->is_active
            && $this->valid_from->isPast()
            && $this->valid_to->isFuture()
            && $this->current_number < $this->to_number;
    }

    /** Obtiene el siguiente consecutivo y lo reserva (safe para concurrencia) */
    public function getNextNumber(): int
    {
        if ($this->current_number >= $this->to_number) {
            throw new \RuntimeException(
                "La resolución {$this->resolution_number} no tiene números disponibles."
            );
        }

        $next = $this->current_number + 1;
        $this->increment('current_number');
        $this->refresh();
        return $next;
    }

    /** Forma el número completo con prefijo */
    public function formatNumber(int $number): string
    {
        return ($this->prefix ?? '') . str_pad($number, 9, '0', STR_PAD_LEFT);
    }

    /** Números restantes */
    public function getRemainingAttribute(): int
    {
        return max(0, $this->to_number - $this->current_number);
    }

    /** Porcentaje de uso de la resolución */
    public function getUsagePercentAttribute(): float
    {
        $range = $this->to_number - $this->from_number + 1;
        if ($range <= 0) return 100;
        return round(($this->current_number - $this->from_number) / $range * 100, 1);
    }

    // ── Scopes ──────────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('valid_to', '>=', now());
    }

    public function scopeForCompany($query, int $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    public function scopeForType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
