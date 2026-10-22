<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = ['order_id', 'product_id', 'price', 'qty'];

    protected static function booted(): void
    {
        // Keep the parent's total in sync (Topic 70: $order->fresh()->total)
        static::saved(fn (OrderItem $item) => $item->order->recalculateTotal());
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
