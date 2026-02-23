<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $fillable = [
        'name',
        'nit',
        'nit_dv',
        'razon_social',
        'nombre_comercial',
        'tipo_persona',
        'regimen_tributario',
        'responsable_iva',
        'gran_contribuyente',
        'autorretenedor',
        'actividad_economica',
        'email',
        'phone',
        'address',
        'city',
        'department',
        'postal_code',
        'logo_path',
        'dian_ambiente',
        'dian_software_id',
        'dian_software_pin',
        'dian_certificate_path',
        'dian_certificate_pass',
        'dian_technical_key',
        'dian_prefix',
        'dian_resolution_number',
        'dian_resolution_date',
        'dian_resolution_from',
        'dian_resolution_to',
        'dian_resolution_valid_until',
        'dian_provider',
        'plan',
        'is_active',
        'fiscal_year_start',
        'default_currency_id',
        'decimal_places',
    ];

    protected $hidden = [
        'dian_certificate_pass',
        'dian_software_pin',
        'dian_technical_key',
    ];

    protected function casts(): array
    {
        return [
            'responsable_iva'     => 'boolean',
            'gran_contribuyente'  => 'boolean',
            'autorretenedor'      => 'boolean',
            'is_active'           => 'boolean',
            'dian_resolution_date' => 'date',
            'dian_resolution_valid_until' => 'date',
            'fiscal_year_start'   => 'date',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function getNitFormattedAttribute(): string
    {
        if ($this->nit_dv) {
            return $this->nit.'-'.$this->nit_dv;
        }

        return $this->nit;
    }
}
