<?php

namespace Tests\Feature\Topics;

use App\Contracts\PaymentGateway;
use App\Models\User;
use App\Services\Payments\RazorpayGateway;
use App\Services\Payments\StripeGateway;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 004: The Service Container (IoC Container) (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic004
 *
 * The container reads type-hints and builds dependencies for you (auto-wiring), both for
 * app(...) calls and for controller constructors.
 */
class Topic004_ServiceContainerTest extends TestCase
{
    use RefreshDatabase;

    public function test_manual_resolution_builds_the_whole_dependency_graph(): void
    {
        $service = app(PaymentService::class);
        $same = app()->make(PaymentService::class);

        $this->assertInstanceOf(RazorpayGateway::class, $service->gateway);   // interface -> binding
        $this->assertNotSame($service, $same);                                // not a singleton
    }

    public function test_the_controller_constructor_is_auto_wired(): void
    {
        $this->app->instance(PaymentGateway::class, new StripeGateway);       // swap the implementation

        $this->actingAs(User::factory()->create())
            ->post('/payments', ['amount' => 49900])
            ->assertOk()
            ->assertJsonPath('amount', 49900)
            ->assertJson(fn ($json) => $json->where('payment_id', fn ($id) => str_starts_with($id, 'ch_'))->etc());
    }
}
