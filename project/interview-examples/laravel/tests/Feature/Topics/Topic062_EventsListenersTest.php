<?php

namespace Tests\Feature\Topics;

use App\Events\OrderPlaced;
use App\Listeners\RecordOrderAnalytics;
use App\Listeners\SendOrderConfirmation;
use App\Mail\OrderConfirmed;
use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

/**
 * Topic 062: Events and Listeners (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic062
 *
 * One event, two auto-discovered listeners (one queued). ShouldDispatchAfterCommit means a
 * rolled-back transaction never announces the order.
 */
class Topic062_EventsListenersTest extends TestCase
{
    use RefreshDatabase;

    public function test_listeners_are_auto_discovered(): void
    {
        Event::fake();

        Event::assertListening(OrderPlaced::class, SendOrderConfirmation::class);
        Event::assertListening(OrderPlaced::class, RecordOrderAnalytics::class);
        $this->assertContains(ShouldQueue::class, class_implements(SendOrderConfirmation::class));
    }

    public function test_both_listeners_run(): void
    {
        Mail::fake();
        $order = Order::factory()->create();

        OrderPlaced::dispatch($order);

        Mail::assertQueued(OrderConfirmed::class, fn ($mail) => $mail->hasTo($order->user->email));
        $this->assertSame(["analytics:order-{$order->id}"], $this->trace());
    }

    public function test_rolled_back_transaction_never_dispatches(): void
    {
        Mail::fake();

        try {
            DB::transaction(function () {
                OrderPlaced::dispatch(Order::factory()->create());
                throw new RuntimeException('payment failed');
            });
        } catch (RuntimeException) {
        }

        $this->assertSame([], $this->trace());
        Mail::assertNothingQueued();
    }
}
