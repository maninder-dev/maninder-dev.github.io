<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\OrderStatus;
use App\Events\OrderPlaced;
use App\Models\Order;
use App\Models\User;
use App\Support\Cart;
use Illuminate\Support\Facades\DB;

/**
 * Topic 82: business logic lives here, not in the controller. Reusable from controllers,
 * jobs, commands and tests. Everything inside the transaction rolls back if the charge fails.
 */
class CheckoutService
{
    public function __construct(
        private PaymentGateway $gateway,
        private InventoryService $inventory,
    ) {}

    public function checkout(User $user, Cart $cart): Order
    {
        return DB::transaction(function () use ($user, $cart) {
            $this->inventory->reserve($cart);

            $order = $user->orders()->create(['total' => $cart->total(), 'status' => OrderStatus::Pending]);
            foreach ($cart->lines as $line) {
                $order->items()->create(['product_id' => $line['product']->id, 'price' => $line['product']->price, 'qty' => $line['qty']]);
            }

            $this->gateway->charge($user, $cart->total(), idempotencyKey: "order-{$order->id}");
            $order->update(['status' => OrderStatus::Paid]);

            OrderPlaced::dispatch($order);

            return $order;
        });
    }
}
