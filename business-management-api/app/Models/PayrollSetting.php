<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollSetting extends Model
{
    protected $fillable = [
        'company_id',
        'year',
        'smmlv',
        'transport_allowance',
        'is_active',
    ];

    protected $casts = [
        'year'                => 'integer',
        'smmlv'               => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'is_active'           => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Devuelve la configuración activa para la empresa dada.
     * Si no existe registro activo, cae al registro más reciente por año.
     */
    public static function activeForCompany(int $companyId): ?self
    {
        return static::where('company_id', $companyId)
            ->where('is_active', true)
            ->first()
            ?? static::where('company_id', $companyId)
                ->orderByDesc('year')
                ->first();
    }
}
