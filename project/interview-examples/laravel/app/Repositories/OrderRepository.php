<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/** Topic 84: data access hidden behind an interface (bound in AppServiceProvider). */
interface OrderRepository
{
    public function findForUser(int $userId, int $perPage = 15): LengthAwarePaginator;
}
