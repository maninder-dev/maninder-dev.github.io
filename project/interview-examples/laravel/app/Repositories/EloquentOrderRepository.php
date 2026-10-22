<?php

namespace App\Repositories;

use App\Models\Order;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EloquentOrderRepository implements OrderRepository
{
    public function findForUser(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return Order::with('items')->where('user_id', $userId)->latest('id')->paginate($perPage);
    }
}
