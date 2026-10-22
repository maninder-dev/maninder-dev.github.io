<?php

namespace App\Services;

use App\Exceptions\InsufficientStock;
use App\Models\Product;
use App\Support\Cart;

/** Topic 82: reserves stock with an atomic conditional decrement (never below zero). */
class InventoryService
{
    public function reserve(Cart $cart): void
    {
        foreach ($cart->lines as $line) {
            $updated = Product::whereKey($line['product']->id)
                ->where('stock', '>=', $line['qty'])
                ->decrement('stock', $line['qty']);

            if ($updated === 0) {
                throw new InsufficientStock($line['product']->name);
            }
        }
    }
}
