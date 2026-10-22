<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;

/** Topic 104: vendors may only manage their own products; admins may manage all. */
class ProductPolicy
{
    public function update(User $user, Product $product): bool
    {
        return $user->hasRole('admin') || $product->vendor_id === $user->vendor?->id;
    }
}
