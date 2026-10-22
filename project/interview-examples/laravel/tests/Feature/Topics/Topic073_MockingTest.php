<?php

namespace Tests\Feature\Topics;

use App\Contracts\PaymentGateway;
use App\Enums\OrderStatus;
use App\Exceptions\CardDeclined;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Topic 073: Mocking Dependencies (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic073
 *
 * $this->mock() puts a Mockery mock into the container, so the route closure that type-hints
 * PaymentGateway receives it. travelTo()/travel() freeze and move time.
 */
class Topic073_MockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_marks_the_order_failed_when_the_gateway_declines(): void
    {
        $this->mock(PaymentGateway::class, function (MockInterface $mock) {
            $mock->shouldReceive('charge')->once()->andThrow(new CardDeclined('Insufficient funds'));
        });
        $order = Order::factory()->create();

        $this->actingAs($order->user)->post("/orders/{$order->id}/pay")
            ->assertSessionHasErrors(['payment' => 'Insufficient funds']);

        $this->assertSame(OrderStatus::Failed, $order->fresh()->status);
    }

    public function test_successful_charge_with_argument_expectations(): void
    {
        $order = Order::factory()->create(['total' => 1500]);
        $this->mock(PaymentGateway::class)->shouldReceive('charge')->once()
            ->withArgs(fn ($user, $amount, $key) => $user->is($order->user) && $amount === 1500 && $key === "order-{$order->id}")
            ->andReturn('pay_1');

        $this->actingAs($order->user)->post("/orders/{$order->id}/pay");

        $this->assertSame(OrderStatus::Paid, $order->fresh()->status);
    }

    public function test_time_travel(): void
    {
        $this->travelTo(Carbon::parse('2026-03-01 09:00'));
        $this->assertSame('2026-03-01', now()->toDateString());

        $this->travel(5)->days();
        $this->assertSame('2026-03-06', now()->toDateString());
    }
}
