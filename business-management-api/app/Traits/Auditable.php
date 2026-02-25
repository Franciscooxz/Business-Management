<?php

namespace App\Traits;

use App\Models\AuditLog;

/**
 * Auditable
 *
 * Registra automáticamente en audit_logs todos los cambios (crear, modificar,
 * eliminar, restaurar) de los modelos que usen este trait.
 *
 * Campos excluidos del log por seguridad:
 *   - password, remember_token, api_token
 *
 * Uso:
 *   use App\Traits\Auditable;
 *   class Voucher extends Model { use Auditable; }
 */
trait Auditable
{
    /** Campos sensibles que NUNCA se incluyen en los logs */
    protected array $auditExclude = [
        'password', 'remember_token', 'api_token', 'token',
    ];

    protected static function bootAuditable(): void
    {
        // ── CREATED ──────────────────────────────────────────────────────────
        static::created(function ($model) {
            AuditLog::record(
                event:      'created',
                model:      $model,
                newValues:  $model->filterAuditFields($model->getAttributes()),
            );
        });

        // ── UPDATING: capturar valores ANTES del save ─────────────────────────
        static::updating(function ($model) {
            $model->_auditOldValues = $model->filterAuditFields(
                array_intersect_key($model->getOriginal(), $model->getDirty())
            );
            $model->_auditNewValues = $model->filterAuditFields($model->getDirty());
        });

        // ── UPDATED: registrar DESPUÉS del save ───────────────────────────────
        static::updated(function ($model) {
            $old = $model->_auditOldValues ?? [];
            $new = $model->_auditNewValues ?? [];

            // Solo registrar si hay cambios reales
            if (! empty($new)) {
                AuditLog::record(
                    event:     'updated',
                    model:     $model,
                    oldValues: $old,
                    newValues: $new,
                );
            }
        });

        // ── DELETED ───────────────────────────────────────────────────────────
        static::deleted(function ($model) {
            AuditLog::record(
                event:     'deleted',
                model:     $model,
                oldValues: $model->filterAuditFields($model->getAttributes()),
            );
        });

        // ── RESTORED (SoftDeletes) ────────────────────────────────────────────
        if (in_array('Illuminate\Database\Eloquent\SoftDeletes', class_uses_recursive(static::class))) {
            static::restored(function ($model) {
                AuditLog::record(
                    event: 'restored',
                    model: $model,
                );
            });
        }
    }

    /**
     * Filtra campos sensibles antes de guardar en el log.
     */
    public function filterAuditFields(array $data): array
    {
        $exclude = array_merge($this->auditExclude, $this->auditExclude ?? []);

        return collect($data)
            ->except($exclude)
            ->map(fn($v) => is_array($v) ? '[array]' : $v)
            ->toArray();
    }
}
