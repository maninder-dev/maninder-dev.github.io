<?php

namespace App\Pipelines\Filters;

use Closure;
use Illuminate\Database\Eloquent\Builder;

/** Sorting by an allow-listed column only (column names are never bound, Topic 54). */
class Sort
{
    public function handle(Builder $query, Closure $next)
    {
        $sort = in_array(request('sort'), ['price', 'name'], true) ? request('sort') : 'id';
        $query->orderBy($sort, request('dir') === 'desc' ? 'desc' : 'asc');

        return $next($query);
    }
}
