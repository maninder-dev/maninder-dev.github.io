<?php

namespace App\Pipelines\Filters;

use Closure;
use Illuminate\Database\Eloquent\Builder;

class ByPriceRange
{
    public function handle(Builder $query, Closure $next)
    {
        if (request()->filled('min')) {
            $query->where('price', '>=', request()->integer('min'));
        }
        if (request()->filled('max')) {
            $query->where('price', '<=', request()->integer('max'));
        }

        return $next($query);
    }
}
