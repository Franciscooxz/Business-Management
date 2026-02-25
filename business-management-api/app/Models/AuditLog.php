<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // Los logs son inmutables — sin updated_at
    const UPDATED_AT = null;

    protected $fillable = [
        'company_id',
        'user_id',
        'user_name',
        'event',
        'model_type',
        'model_id',
        'model_label',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'url',
        'description',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // ── Etiquetas legibles ────────────────────────────────────────────────────

    const EVENT_LABELS = [
        'created'       => 'Creado',
        'updated'       => 'Modificado',
        'deleted'       => 'Eliminado',
        'restored'      => 'Restaurado',
        'login'         => 'Inicio de sesión',
        'logout'        => 'Cierre de sesión',
        'login_failed'  => 'Intento fallido',
        'token_expired' => 'Sesión expirada',
        'unauthorized'  => 'Acceso denegado',
    ];

    const EVENT_COLORS = [
        'created'       => 'green',
        'updated'       => 'blue',
        'deleted'       => 'red',
        'restored'      => 'purple',
        'login'         => 'gray',
        'logout'        => 'gray',
        'login_failed'  => 'amber',
        'token_expired' => 'amber',
        'unauthorized'  => 'red',
    ];

    // ── Relaciones ────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getEventLabelAttribute(): string
    {
        return self::EVENT_LABELS[$this->event] ?? $this->event;
    }

    public function getEventColorAttribute(): string
    {
        return self::EVENT_COLORS[$this->event] ?? 'gray';
    }

    // ── Factory method para crear logs fácilmente ─────────────────────────────

    public static function record(
        string  $event,
        ?Model  $model      = null,
        ?array  $oldValues  = null,
        ?array  $newValues  = null,
        ?string $description = null,
    ): void {
        try {
            static::create([
                'company_id'  => auth()->user()?->company_id,
                'user_id'     => auth()->id(),
                'user_name'   => auth()->user()?->name,
                'event'       => $event,
                'model_type'  => $model ? get_class($model) : null,
                'model_id'    => $model?->id,
                'model_label' => $model ? static::labelFor($model) : null,
                'old_values'  => $oldValues,
                'new_values'  => $newValues,
                'ip_address'  => request()->ip(),
                'user_agent'  => substr(request()->userAgent() ?? '', 0, 255),
                'url'         => substr(request()->fullUrl(), 0, 500),
                'description' => $description,
            ]);
        } catch (\Throwable $e) {
            // Nunca dejar que el log rompa el flujo principal
            \Illuminate\Support\Facades\Log::warning('AuditLog::record failed: ' . $e->getMessage());
        }
    }

    private static function labelFor(Model $model): string
    {
        // Intentar generar una etiqueta legible según el tipo de modelo
        if (method_exists($model, 'getAuditLabel')) {
            return $model->getAuditLabel();
        }

        $class = class_basename($model);

        return match ($class) {
            'Voucher'          => "Comprobante {$model->full_number}",
            'ElectronicInvoice'=> "Factura {$model->full_number}",
            'Employee'         => "Empleado {$model->first_name} {$model->last_name}",
            'PayrollPeriod'    => "Nómina #{$model->id}",
            'TaxDeclaration'   => "Declaración #{$model->id}",
            'User'             => "Usuario {$model->email}",
            default            => "{$class} #{$model->id}",
        };
    }
}
