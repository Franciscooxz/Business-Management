<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BelongsToCompany;

class ThirdParty extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [
        'company_id',
        'document_type',
        'document_number',
        'dv',
        'first_name',
        'last_name',
        'razon_social',
        'nombre_comercial',
        'is_customer',
        'is_supplier',
        'is_employee',
        'persona_type',
        'regimen_tributario',
        'responsable_iva',
        'gran_contribuyente',
        'autorretenedor',
        'declarante_renta',
        'actividad_economica',
        'apply_retefuente',
        'apply_reteica',
        'apply_reteiva',
        'reteica_rate',
        'email',
        'email_fe',
        'phone',
        'mobile',
        'address',
        'city',
        'department',
        'postal_code',
        'country',
        'legacy_customer_id',
        'legacy_supplier_id',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_customer'        => 'boolean',
            'is_supplier'        => 'boolean',
            'is_employee'        => 'boolean',
            'responsable_iva'    => 'boolean',
            'gran_contribuyente' => 'boolean',
            'autorretenedor'     => 'boolean',
            'declarante_renta'   => 'boolean',
            'apply_retefuente'   => 'boolean',
            'apply_reteica'      => 'boolean',
            'apply_reteiva'      => 'boolean',
            'is_active'          => 'boolean',
            'reteica_rate'       => 'decimal:6',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Nombre completo para mostrar en UI.
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->persona_type === 'juridica') {
            return $this->razon_social ?? $this->nombre_comercial ?? '';
        }

        return trim(($this->first_name ?? '').' '.($this->last_name ?? ''));
    }

    /**
     * NIT con digito verificacion.
     */
    public function getDocumentFormattedAttribute(): string
    {
        if ($this->document_type === 'NIT' && $this->dv) {
            return $this->document_number.'-'.$this->dv;
        }

        return $this->document_type.': '.$this->document_number;
    }
}
