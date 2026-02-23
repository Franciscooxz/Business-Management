<?php

namespace App\Traits;

use Illuminate\Support\Facades\DB;

trait GeneratesConsecutive
{
    protected static function bootGeneratesConsecutive(): void
    {
        static::creating(function ($model) {
            if (empty($model->{static::getConsecutiveColumn()})) {
                $model->{static::getConsecutiveColumn()} = static::nextConsecutive($model);
            }
        });
    }

    protected static function getConsecutiveColumn(): string
    {
        return 'consecutive';
    }

    protected static function getConsecutiveGroupBy(): array
    {
        return ['company_id'];
    }

    protected static function nextConsecutive($model): int
    {
        $query = DB::table((new static())->getTable());

        foreach (static::getConsecutiveGroupBy() as $column) {
            if (!empty($model->{$column})) {
                $query->where($column, $model->{$column});
            }
        }

        if (method_exists(static::class, 'getConsecutiveExtraGroupBy')) {
            foreach (static::getConsecutiveExtraGroupBy() as $column) {
                if (!empty($model->{$column})) {
                    $query->where($column, $model->{$column});
                }
            }
        }

        return ((int) $query->max(static::getConsecutiveColumn())) + 1;
    }
}
