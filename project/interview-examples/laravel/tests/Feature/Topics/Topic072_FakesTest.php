<?php

namespace Tests\Feature\Topics;

use App\Events\OrderPlaced;
use App\Jobs\GenerateInvoicePdf;
use App\Mail\OrderConfirmed;
use App\Models\Product;
use App\Models\User;
use App\Notifications\InvoicePaid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Topic 072: Fakes: Queue, Mail, Event, Notification, Storage, Http (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic072
 *
 * POST /checkout touches a payment API, a queued job, a listener that queues mail, and a
 * notification. Fakes replace each side effect so we can assert what WOULD have happened.
 */
class Topic072_FakesTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_side_effects(): void
    {
        Queue::fake([GenerateInvoicePdf::class]);       // fake only this job; queued listeners still run
        Mail::fake();
        Notification::fake();
        Storage::fake('s3');
        Http::fake(['api.razorpay.com/*' => Http::response(['id' => 'pay_123', 'status' => 'captured'], 200)]);

        $user = User::factory()->create();
        $product = Product::factory()->create(['price' => 49_900, 'stock' => 3]);

        $this->actingAs($user)->post('/checkout', ['items' => [['product_id' => $product->id, 'qty' => 1]]])->assertRedirect();

        Queue::assertPushedOn('pdfs', GenerateInvoicePdf::class, fn ($job) => $job->order->user_id === $user->id);
        Mail::assertQueued(OrderConfirmed::class, fn ($mail) => $mail->hasTo($user->email));
        Notification::assertSentTo($user, InvoicePaid::class);
        Http::assertSent(fn (Request $request) => $request->url() === 'https://api.razorpay.com/v1/payments'
            && $request['amount'] === 49_900
            && $request->hasHeader('Idempotency-Key'));
        Storage::disk('s3')->assertDirectoryEmpty('/');
    }

    public function test_event_fake_only_for_one_event(): void
    {
        Event::fake([OrderPlaced::class]);
        Http::fake(['*' => Http::response(['id' => 'pay_1', 'status' => 'captured'])]);
        Notification::fake();
        Queue::fake([GenerateInvoicePdf::class]);

        $user = User::factory()->create();
        $product = Product::factory()->create();
        $this->actingAs($user)->post('/checkout', ['items' => [['product_id' => $product->id, 'qty' => 1]]]);

        Event::assertDispatched(OrderPlaced::class);
        $this->assertSame([], $this->trace());          // its listeners did not run
    }
}
