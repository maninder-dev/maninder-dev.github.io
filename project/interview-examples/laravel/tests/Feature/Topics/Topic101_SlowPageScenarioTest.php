<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 101: Scenario: A Page Is Slow. How Do You Debug It? (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic101
 *
 * Measure first (query count), then fix the N+1: 1 + 50 + 50 queries become 2 with
 * with('user:id,name') + withCount('items'). GET /orders-report is the fixed version.
 */
class Topic101_SlowPageScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Order::factory()->count(50)->hasItems(2)->create();
    }

    public function test_before_one_plus_fifty_plus_fifty(): void
    {
        Model::preventLazyLoading(false);
        try {
            $queries = $this->queriesDuring(function () {
                foreach (Order::latest('id')->take(50)->get() as $order) {
                    $order->user->name;
                    $order->items->count();
                }
            });
        } finally {
            Model::preventLazyLoading(true);
        }

        $this->assertCount(101, $queries);
    }

    public function test_after_two_queries(): void
    {
        $queries = $this->queriesDuring(fn () => $this->get('/orders-report')->assertOk()->assertJsonCount(50));

        $this->assertCount(2, $queries);
        $this->assertStringContainsString('as "items_count"', $queries[0]);
        $this->assertStringContainsString('select "id", "name" from "users"', $queries[1]);
    }
}
