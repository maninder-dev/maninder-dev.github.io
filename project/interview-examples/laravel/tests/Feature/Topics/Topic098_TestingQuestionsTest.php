<?php

namespace Tests\Feature\Topics;

use App\Events\OrderPlaced;
use App\Exceptions\PaymentFailed;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

/**
 * Topic 098: Testing Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic098
 *
 * Feature vs unit (see Topic 74), RefreshDatabase (Topic 70), Http::fake + preventStrayRequests
 * (enabled for every test in tests/TestCase.php), Event::fake + assertNotDispatched.
 */
class Topic098_TestingQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_feature_test_through_the_full_stack(): void
    {
        $this->actingAs(User::factory()->create(['name' => 'Ann']))->get('/dashboard')->assertOk()->assertSee('Welcome');
    }

    public function test_external_api_is_faked_and_asserted(): void
    {
        Http::fake(['api.shiprocket.in/*' => Http::response(['awb' => 'AWB123'], 200)]);
        $order = Order::factory()->create();

        $this->actingAs($order->user)->post("/orders/{$order->id}/ship")->assertOk();

        Http::assertSent(fn (Request $r) => $r->url() === 'https://api.shiprocket.in/v1/shipments' && $r['order_id'] === $order->id);
        $this->assertSame('AWB123', $order->fresh()->awb);
    }

    public function test_stray_requests_are_blocked(): void
    {
        $this->expectException(RuntimeException::class);
        \Illuminate\Support\Facades\Http::get('https://example.com');
    }

    public function test_event_dispatched_without_running_listeners(): void
    {
        Event::fake([OrderPlaced::class]);
        Http::fake(['*' => Http::response(['id' => 'pay_1', 'status' => 'captured'])]);
        Notification::fake();
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/checkout', ['items' => [['product_id' => Product::factory()->create()->id, 'qty' => 1]]]);

        Event::assertDispatched(OrderPlaced::class, fn ($e) => $e->order->user_id === $user->id);
        Event::assertNotDispatched(PaymentFailed::class);
    }
}
