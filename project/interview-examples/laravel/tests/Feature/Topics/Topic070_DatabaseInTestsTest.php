<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 070: Database in Tests (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic070
 *
 * RefreshDatabase migrates once and wraps each test in a transaction; phpunit.xml points
 * DB_CONNECTION at sqlite :memory:. Factories with hasItems(), database assertions.
 */
class Topic070_DatabaseInTestsTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_total_is_calculated(): void
    {
        $order = Order::factory()->hasItems(3, ['price' => 100, 'qty' => 2])->create();

        $this->assertEquals(600, $order->fresh()->total->paise);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending']);
        $this->assertDatabaseCount('order_items', 3);

        $order->delete();
        $this->assertSoftDeleted($order);
    }

    public function test_each_test_starts_with_an_empty_database(): void
    {
        $this->assertDatabaseCount('orders', 0);                 // the previous test was rolled back
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }
}
