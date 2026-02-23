<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ElectronicInvoice extends Model
{
    const DOCUMENT_TYPES = [
        '01' => 'Factura de Venta',
        '91' => 'Nota de Crédito',
        '92' => 'Nota de Débito',
    ];

    const STATUS_LABELS = [
        'draft'     => 'Borrador',
        'signed'    => 'Firmada',
        'sent'      => 'Enviada',
        'accepted'  => 'Aceptada DIAN',
        'rejected'  => 'Rechazada DIAN',
        'cancelled' => 'Anulada',
    ];

    // Códigos de corrección para notas crédito (DIAN)
    const CORRECTION_CONCEPTS = [
        '1'  => 'Devolución parcial',
        '2'  => 'Anulación',
        '3'  => 'Rebaja',
        '4'  => 'Descuento',
        '5'  => 'Rescisión / resolución',
        '6'  => 'Otros',
    ];

    protected $fillable = [
        'company_id', 'resolution_id', 'document_type', 'document_type_name',
        'prefix', 'number', 'full_number',
        'issue_date', 'issue_time', 'cufe',
        'buyer_id', 'buyer_name', 'buyer_document', 'buyer_document_type',
        'buyer_email', 'buyer_address', 'buyer_city', 'buyer_department',
        'reference_invoice_id', 'correction_concept',
        'currency', 'exchange_rate',
        'subtotal', 'discount_total', 'tax_iva', 'tax_inc', 'tax_ica',
        'tax_retefuente', 'tax_reteiva', 'tax_reteica', 'total',
        'status', 'dian_track_id', 'dian_is_valid', 'dian_status_code',
        'dian_status_message', 'dian_validated_at',
        'xml_path', 'pdf_path', 'xml_content',
        'voucher_id', 'notes', 'sent_at', 'accepted_at', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'        => 'date',
            'dian_is_valid'     => 'boolean',
            'dian_validated_at' => 'datetime',
            'sent_at'           => 'datetime',
            'accepted_at'       => 'datetime',
            'subtotal'          => 'decimal:2',
            'discount_total'    => 'decimal:2',
            'tax_iva'           => 'decimal:2',
            'tax_inc'           => 'decimal:2',
            'tax_ica'           => 'decimal:2',
            'tax_retefuente'    => 'decimal:2',
            'tax_reteiva'       => 'decimal:2',
            'tax_reteica'       => 'decimal:2',
            'total'             => 'decimal:2',
            'exchange_rate'     => 'decimal:6',
        ];
    }

    // ── Relaciones ──────────────────────────────────────────────────────────────

    public function company(): BelongsTo  { return $this->belongsTo(Company::class); }
    public function resolution(): BelongsTo { return $this->belongsTo(DianResolution::class); }
    public function buyer(): BelongsTo    { return $this->belongsTo(ThirdParty::class, 'buyer_id'); }
    public function createdBy(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function voucher(): BelongsTo  { return $this->belongsTo(Voucher::class); }
    public function referenceInvoice(): BelongsTo { return $this->belongsTo(self::class, 'reference_invoice_id'); }

    public function items(): HasMany
    {
        return $this->hasMany(ElectronicInvoiceItem::class, 'invoice_id')->orderBy('line_number');
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    public function isDraft(): bool    { return $this->status === 'draft'; }
    public function isSigned(): bool   { return $this->status === 'signed'; }
    public function isSent(): bool     { return $this->status === 'sent'; }
    public function isAccepted(): bool { return $this->status === 'accepted'; }
    public function isRejected(): bool { return $this->status === 'rejected'; }

    /** Link de validación DIAN para QR */
    public function getValidationUrlAttribute(): ?string
    {
        if (!$this->cufe) return null;
        $env = $this->resolution->environment ?? 'habilitacion';
        $base = $env === 'produccion'
            ? 'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey='
            : 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=';
        return $base . $this->cufe;
    }

    /** Total de retenciones (reducen el valor a pagar) */
    public function getTotalRetentionsAttribute(): float
    {
        return (float) $this->tax_retefuente + (float) $this->tax_reteiva + (float) $this->tax_reteica;
    }

    /** Valor a pagar neto (total - retenciones) */
    public function getNetPayableAttribute(): float
    {
        return (float) $this->total - $this->total_retentions;
    }

    // ── Scopes ──────────────────────────────────────────────────────────────────

    public function scopeForCompany($query, int $id) { return $query->where('company_id', $id); }
    public function scopeDraft($query)    { return $query->where('status', 'draft'); }
    public function scopeAccepted($query) { return $query->where('status', 'accepted'); }
    public function scopeRejected($query) { return $query->where('status', 'rejected'); }
}
