<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

/**
 * BelongsToCompany
 *
 * Global Scope que aísla automáticamente todos los registros por empresa.
 * Cualquier modelo que use este trait filtrará por el company_id del usuario
 * autenticado en CADA query, sin necesidad de recordarlo en los controladores.
 *
 * Uso:
 *   use App\Traits\BelongsToCompany;
 *   class MiModelo extends Model { use BelongsToCompany; }
 */
trait BelongsToCompany
{
    protected static function booted(): void
    {
        // ── Global Scope de empresa ───────────────────────────────────────────
        static::addGlobalScope('company', function (Builder $query) {
            // No aplicar en consola (seeders, migraciones, comandos artisan)
            if (app()->runningInConsole()) {
                return;
            }

            if (auth()->check() && auth()->user()->company_id) {
                $table = (new static)->getTable();
                $query->where("{$table}.company_id", auth()->user()->company_id);
            }
        });

        // ── Auto-asignación al crear ──────────────────────────────────────────
        static::creating(function ($model) {
            if (empty($model->company_id) && auth()->check()) {
                $model->company_id = auth()->user()->company_id;
            }
        });
    }

    // ── Scopes de utilidad ────────────────────────────────────────────────────

    /**
     * Ignora el filtro de empresa — para uso admin / seeder / cron.
     * Ejemplo: PucAccount::withoutCompany()->get();
     */
    public function scopeWithoutCompany(Builder $query): Builder
    {
        return $query->withoutGlobalScope('company');
    }

    /**
     * Filtra por una empresa específica, ignorando la del usuario autenticado.
     * Ejemplo: PucAccount::forCompany(3)->get();
     */
    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope('company')
                     ->where($this->getTable() . '.company_id', $companyId);
    }
}
