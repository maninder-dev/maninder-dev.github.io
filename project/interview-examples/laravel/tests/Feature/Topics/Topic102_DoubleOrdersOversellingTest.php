<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Topic 102: Scenario: Prevent Double Orders and Overselling (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic102
 *
 * POST /api/v1/orders (App\Http\Controllers\Api\V1\OrderController::store):
 *  - Idempotency-Key: a retried request returns the ORIGINAL order (200), never a second one;
 *  - a cache lock per key serialises simultaneous retries;
 *  - an atomic conditional decrement in a transaction: stock can't go below zero (409 instead);
 *  - a unique index on orders.idempotency_key is the last line of defence.
 */
class Topic102_DoubleOrdersOversellingTest extends TestCase
{
    use RefreshDatabase;

    private function order(Product $product, string $key, int $qty = 1)
    {
        return $this->postJson('/api/v1/orders', ['items' => [['product_id' => $product->id, 'qty' => $qty]]], ['Idempotency-Key' => $key]);
    }

    public function test_retrying_with_the_same_key_returns_the_original_order(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $product = Product::factory()->create(['stock' => 10, 'price' => 500]);

        $first = $this->order($product, 'checkout-abc', 2)->assertCreated();
        $retry = $this->order($product, 'checkout-abc', 2)->assertOk();

        $this->assertSame($first->json('data.id'), $retry->json('data.id'));
        $this->assertSame(1, Order::count());
        $this->assertSame(8, $product->fresh()->stock);                       // decremented once
        $this->assertSame(1000, $first->json('data.total'));
    }

    public function test_last_item_cannot_be_sold_twice(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $product = Product::factory()->create(['stock' => 1]);

        $this->order($product, 'buyer-1')->assertCreated();
        $this->order($product, 'buyer-2')->assertStatus(409)->assertJsonPath('message', 'Sorry, this item just sold out.');

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(1, Order::count());                                 // the failed attempt left nothing behind
    }

    public function test_a_failed_line_rolls_back_the_whole_order(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $plenty = Product::factory()->create(['stock' => 5]);
        $scarce = Product::factory()->create(['stock' => 1]);

        $this->postJson('/api/v1/orders', ['items' => [
            ['product_id' => $plenty->id, 'qty' => 2],
            ['product_id' => $scarce->id, 'qty' => 3],
        ]], ['Idempotency-Key' => 'k'])->assertStatus(409);

        $this->assertSame(5, $plenty->fresh()->stock);                        // transaction rolled back
    }

    public function test_the_lock_is_released_and_the_unique_index_exists(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $this->order(Product::factory()->create(['stock' => 3]), 'lock-key')->assertCreated();

        $this->assertTrue(Cache::lock('order:lock-key', 10)->get());       // free again after the request
        $unique = collect(DB::getSchemaBuilder()->getIndexes('orders'))->firstWhere('columns', ['idempotency_key']);
        $this->assertTrue($unique['unique']);
    }
}
