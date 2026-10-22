<?php

namespace App\Support;

use App\Models\Product;
use Illuminate\Support\Collection;

/** Topic 82: a plain cart built from request lines [['product_id' => 1, 'qty' => 2], ...]. */
final class Cart
{
    /** @param Collection<int, array{product: Product, qty: int}> $lines */
    public function __construct(public readonly Collection $lines) {}

    public static function fromLines(array $lines): self
    {
        $products = Product::findMany(array_column($lines, 'product_id'))->keyBy('id');

        return new self(collect($lines)->map(fn (array $l) => [
            'product' => $products[$l['product_id']],
            'qty' => (int) $l['qty'],
        ]));
    }

    public function total(): int
    {
        return $this->lines->sum(fn (array $l) => $l['product']->price * $l['qty']);
    }
}
