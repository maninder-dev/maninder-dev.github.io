<?php

namespace App\Models;

use App\Casts\MoneyCast;
use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/** Topics 35, 70, 87 (MoneyCast), 90/100 (enum cast), 94 (appended computed attribute), 102. */
class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['user_id', 'status', 'total', 'currency', 'meta', 'idempotency_key', 'product_id', 'qty', 'invoice_path', 'awb'];

    protected $attributes = [
        'status' => 'pending', 'total' => 0, 'qty' => 1, 'currency' => null, 'meta' => null,
        'idempotency_key' => null, 'product_id' => null, 'invoice_path' => null, 'awb' => null,
    ];

    protected $appends = ['total_formatted'];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'total' => MoneyCast::class,
            'meta' => 'array',
        ];
    }

    protected function totalFormatted(): Attribute
    {
        return Attribute::make(get: fn () => $this->total->format());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function recalculateTotal(): void
    {
        $this->update(['total' => (int) $this->items()->sum(DB::raw('price * qty'))]);
    }
}
