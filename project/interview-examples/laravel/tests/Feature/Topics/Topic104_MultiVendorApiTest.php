<?php

namespace Tests\Feature\Topics;

use App\Jobs\ProcessPaymentWebhook;
use App\Models\Product;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Topic 104: Scenario: Design a Multi-Vendor E-Commerce API in Laravel (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic104
 *
 * Two pieces of the design run here: ProductPolicy (vendors manage only their own products) and
 * the payment webhook (HMAC verified, CSRF-exempt, handed to a queued job). Checkout with locks
 * and idempotency is Topics 82 and 102.
 */
class Topic104_MultiVendorApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_vendors_only_manage_their_own_products(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $aliceShop = Vendor::create(['user_id' => $alice->id, 'name' => 'Alice Crafts']);
        Vendor::create(['user_id' => $bob->id, 'name' => 'Bob Books']);
        $product = Product::factory()->create(['vendor_id' => $aliceShop->id]);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->assertTrue(Gate::forUser($alice)->allows('update', $product));
        $this->assertFalse(Gate::forUser($bob)->allows('update', $product));
        $this->assertTrue(Gate::forUser($admin)->allows('update', $product));
    }

    public function test_webhook_signature_is_verified_then_queued(): void
    {
        Queue::fake();
        $body = json_encode(['event' => 'payment.captured', 'payment_id' => 'pay_1']);
        $send = fn (string $signature) => $this->call('POST', '/webhooks/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_X_RAZORPAY_SIGNATURE' => $signature,
        ], $body);

        $send('forged')->assertStatus(400);
        Queue::assertNothingPushed();

        $send(hash_hmac('sha256', $body, 'whsec_test'))->assertNoContent();
        Queue::assertPushed(ProcessPaymentWebhook::class, fn ($job) => $job->payload['payment_id'] === 'pay_1');
    }
}
