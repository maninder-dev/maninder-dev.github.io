<?php

namespace App\Pipelines\Filters;

use Closure;
use Illuminate\Database\Eloquent\Builder;

/** Topic 86: one pipeline stage. Each stage changes the query and passes it on. */
class ByCategory
{
    public function handle(Builder $query, Closure $next)
    {
        if (request()->filled('category')) {
            $query->where('category_id', request()->integer('category'));
        }

        return $next($query);
    }
}
