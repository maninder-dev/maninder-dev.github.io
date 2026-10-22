<?php

namespace Tests\Feature\Topics;

use App\Contracts\PaymentGateway;
use App\Services\CartManager;
use App\Services\CurrencyConverter;
use App\Services\InvoiceService;
use App\Services\Payments\RazorpayGateway;
use App\Services\Payments\StripeGateway;
use App\Services\ReportBuilder;
use Tests\TestCase;

/**
 * Topic 005: Binding: bind, singleton, scoped, instance (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic005
 *
 * Identity checks: bind = new each time; singleton = same forever; scoped = same until the
 * scope (request/job) ends; instance = this exact object; contextual = per consumer.
 */
class Topic005_BindingTest extends TestCase
{
    public function test_bind_gives_a_new_object_each_time(): void
    {
        $this->assertNotSame(app(ReportBuilder::class), app(ReportBuilder::class));
    }

    public function test_singleton_gives_the_same_object_and_reads_config_once(): void
    {
        config(['services.fx.key' => 'fx-123']);
        $a = app(CurrencyConverter::class);
        config(['services.fx.key' => 'changed']);

        $this->assertSame($a, app(CurrencyConverter::class));
        $this->assertSame('fx-123', app(CurrencyConverter::class)->apiKey);
    }

    public function test_scoped_is_shared_until_the_scope_is_flushed(): void
    {
        $a = app(CartManager::class);
        $this->assertSame($a, app(CartManager::class));

        $this->app->forgetScopedInstances();     // what Laravel does between requests / jobs

        $this->assertNotSame($a, app(CartManager::class));
    }

    public function test_instance_registers_an_existing_object(): void
    {
        $gateway = new StripeGateway('sk_test');
        $this->app->instance(PaymentGateway::class, $gateway);

        $this->assertSame($gateway, app(PaymentGateway::class));
    }

    public function test_contextual_binding_gives_a_consumer_its_own_implementation(): void
    {
        config(['payments.driver' => 'stripe']);

        $this->assertInstanceOf(StripeGateway::class, app(PaymentGateway::class));
        $this->assertInstanceOf(RazorpayGateway::class, app(InvoiceService::class)->gateway);
    }
}
