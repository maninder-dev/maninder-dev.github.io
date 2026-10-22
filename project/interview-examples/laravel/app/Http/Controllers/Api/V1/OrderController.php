<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use App\Repositories\OrderRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Topics 71, 81, 84, 102. */
class OrderController extends Controller
{
    public function index(Request $request, OrderRepository $orders)
    {
        abort_unless($request->user()->tokenCan('orders:read'), 403);

        return OrderResource::collection($orders->findForUser($request->user()->id));
    }

    /**
     * Topic 102: prevent double orders and overselling.
     *  1. Idempotency-Key header: a retried request returns the original order (200, not 201).
     *  2. A cache lock per key so two simultaneous retries can't both create an order.
     *  3. An atomic conditional decrement inside a transaction: stock can never go below zero.
     */
    public function store(StoreOrderRequest $request)
    {
        $key = $request->header('Idempotency-Key');
        abort_unless($key, 400, 'Idempotency-Key header is required.');

        $order = Cache::lock("order:{$key}", 10)->block(5, function () use ($key, $request) {
            if ($existing = Order::where('idempotency_key', $key)->first()) {
                return $existing;
            }

            return DB::transaction(function () use ($key, $request) {
                $total = 0;
                $lines = $request->validated('items');
                foreach ($lines as $line) {
                    $updated = Product::whereKey($line['product_id'])
                        ->where('stock', '>=', $line['qty'])
                        ->decrement('stock', $line['qty']);
                    abort_if($updated === 0, 409, 'Sorry, this item just sold out.');
                    $total += Product::whereKey($line['product_id'])->value('price') * $line['qty'];
                }

                return Order::create(['user_id' => $request->user()->id, 'idempotency_key' => $key, 'total' => $total]);
            });
        });

        return (new OrderResource($order))->response()->setStatusCode($order->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, Order $order)
    {
        abort_unless($order->user_id === $request->user()->id, 404);
        $order->delete();

        return response()->noContent();
    }
}
