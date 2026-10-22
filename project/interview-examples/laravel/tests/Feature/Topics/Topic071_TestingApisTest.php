<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Topic 071: Testing APIs (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic071
 */
class Topic071_TestingApisTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_the_authenticated_user_orders_as_json(): void
    {
        $user = User::factory()->has(Order::factory()->count(2))->create();
        Order::factory()->create();                                     // someone else's
        Sanctum::actingAs($user, ['orders:read']);

        $this->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['id', 'total', 'status']], 'meta' => ['total', 'per_page'], 'links'])
            ->assertJsonPath('data.0.status', 'pending');
    }

    public function test_validates_the_order_payload(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/orders', [], ['Idempotency-Key' => 'k1'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }
}
