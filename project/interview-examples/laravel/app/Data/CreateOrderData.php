<?php

namespace App\Data;

use App\Http\Requests\StoreOrderRequest;

/** Topic 85: a typed DTO instead of a loose array passed between layers. */
final readonly class CreateOrderData
{
    public function __construct(
        public int $userId,
        public array $items,
        public ?string $couponCode = null,
    ) {}

    public static function fromRequest(StoreOrderRequest $request): self
    {
        return new self(
            userId: $request->user()->id,
            items: $request->validated('items'),
            couponCode: $request->validated('coupon'),
        );
    }
}
