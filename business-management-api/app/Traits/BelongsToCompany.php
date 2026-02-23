<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToCompany
{
    protected static function bootBelongsToCompany(): void
    {
        static::addGlobalScope('company', function (Builder $query) {
            $companyId = request()->user()?->company_id ?? session('company_id');

            if ($companyId) {
                $query->where(static::getCompanyQualifiedColumn(), $companyId);
            }
        });

        static::creating(function ($model) {
            if (empty($model->company_id)) {
                $model->company_id = request()->user()?->company_id ?? session('company_id');
            }
        });
    }

    protected static function getCompanyQualifiedColumn(): string
    {
        $instance = new static();
        return $instance->getTable().'.company_id';
    }

    public function scopeForCompany(Builder $query, int $companyId): Builder
    {
        return $query->withoutGlobalScope('company')->where('company_id', $companyId);
    }
}
