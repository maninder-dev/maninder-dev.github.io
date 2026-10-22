<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Topic 88 (and the global-scope half of Topic 31): every query is filtered by the current
 * tenant and new rows are stamped with it. Opt out with withoutGlobalScope('tenant').
 */
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if ($tenant = tenant()) {
                $query->where($query->qualifyColumn('tenant_id'), $tenant->id);
            }
        });

        static::creating(fn ($model) => $model->tenant_id ??= tenant()?->id);
    }
}
