<?php

namespace App\Observers;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;

/** Topic 97: invalidate cache on write. Tags need a taggable store (redis, memcached, array). */
class ProductObserver
{
    public function saved(Product $product): void
    {
        Cache::forget("product:{$product->id}");

        if (Cache::supportsTags()) {
            Cache::tags(['catalog'])->flush();
        }
    }
}
