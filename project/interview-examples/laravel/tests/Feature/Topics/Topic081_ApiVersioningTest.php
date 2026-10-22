<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Topic 081: API Versioning and Best Practices (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic081
 *
 * /api/v1 and /api/v2 (routes/api_v2.php) return different shapes for the same data; status
 * codes 201/204/422; throttle:api adds rate-limit headers. Idempotent writes: Topic 102.
 */
class Topic081_ApiVersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_versions_two_shapes(): void
    {
        $user = User::factory()->create();
        Order::factory()->for($user)->create(['total' => 149_900]);
        Sanctum::actingAs($user, ['orders:read']);

        $this->getJson('/api/v1/orders')->assertJsonPath('data.0.total', 149_900);
        $this->getJson('/api/v2/orders')->assertJsonPath('data.0.total', [
            'amount' => 149_900, 'currency' => 'INR', 'formatted' => 'Rs. 1,499.00',
        ]);
    }

    public function test_status_codes_and_rate_limit_headers(): void
    {
        $user = User::factory()->create();
        $order = Order::factory()->for($user)->create();
        Sanctum::actingAs($user, ['orders:read']);

        $this->getJson('/api/v1/orders')->assertHeader('X-RateLimit-Limit', '60');
        $this->deleteJson("/api/v1/orders/{$order->id}")->assertNoContent();
        $this->postJson('/api/v1/orders', ['items' => 'nope'], ['Idempotency-Key' => 'a'])->assertUnprocessable();
        $valid = ['items' => [['product_id' => Product::factory()->create()->id, 'qty' => 1]]];
        $this->postJson('/api/v1/orders', $valid)->assertStatus(400);       // missing Idempotency-Key
        $this->postJson('/api/v1/orders', $valid, ['Idempotency-Key' => 'b'])->assertCreated();
    }
}
