<?php

namespace Tests\Feature\Topics;

use App\Contracts\PaymentGateway;
use App\Models\User;
use App\Services\Payments\RazorpayGateway;
use App\Services\Payments\StripeGateway;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Topic 091: SOLID Principles in Laravel (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic091
 *
 * Dependency inversion + open/closed: PaymentService depends on the PaymentGateway interface,
 * config('payments.driver') picks the implementation. Liskov: either one works for the caller.
 */
class Topic091_SolidTest extends TestCase
{
    use RefreshDatabase;

    public function test_switching_providers_is_one_line_of_config(): void
    {
        config(['payments.driver' => 'stripe']);
        $this->assertInstanceOf(StripeGateway::class, app(PaymentService::class)->gateway);

        config(['payments.driver' => 'razorpay']);
        $this->assertInstanceOf(RazorpayGateway::class, app(PaymentService::class)->gateway);
    }

    public function test_implementations_are_substitutable(): void
    {
        Http::fake(['*' => Http::response(['id' => 'pay_9', 'status' => 'captured'])]);
        $user = User::factory()->create();

        foreach (['stripe', 'razorpay'] as $driver) {
            config(['payments.driver' => $driver]);
            $result = app(PaymentService::class)->charge($user, 500);

            $this->assertInstanceOf(PaymentGateway::class, app(PaymentService::class)->gateway);
            $this->assertSame(500, $result['amount']);
            $this->assertIsString($result['payment_id']);
        }
    }
}
