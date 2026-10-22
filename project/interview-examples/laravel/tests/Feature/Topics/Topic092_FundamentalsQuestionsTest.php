<?php

namespace Tests\Feature\Topics;

use App\Services\CartManager;
use App\Services\CurrencyConverter;
use App\Services\GeoIp;
use App\Services\InvoiceMailer;
use App\Services\PdfRenderer;
use App\Services\ReportBuilder;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

/**
 * Topic 092: Framework Fundamentals Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic092
 *
 * register() vs boot(), bind/singleton/scoped, auto-wiring, facades in tests, env() vs config().
 */
class Topic092_FundamentalsQuestionsTest extends TestCase
{
    public function test_boot_can_use_services_registered_by_other_providers(): void
    {
        // AppServiceProvider::boot() registered a view composer; GeoIp comes from another provider.
        $this->app['view']->composer('demo.geo', fn ($view) => $view->with('country', app(GeoIp::class)->country()));
        $this->assertSame('IN', app(GeoIp::class)->country());
        $this->assertTrue($this->app->bound(GeoIp::class));
    }

    public function test_bind_singleton_scoped_in_one_glance(): void
    {
        $this->assertNotSame(app(ReportBuilder::class), app(ReportBuilder::class));
        $this->assertSame(app(CurrencyConverter::class), app(CurrencyConverter::class));
        $scoped = app(CartManager::class);
        $this->app->forgetScopedInstances();
        $this->assertNotSame($scoped, app(CartManager::class));
    }

    public function test_auto_wiring_by_reflection_but_interfaces_need_a_binding(): void
    {
        $mailer = app(InvoiceMailer::class);       // never bound anywhere
        $this->assertInstanceOf(PdfRenderer::class, $mailer->pdf);
        $this->assertInstanceOf(Filesystem::class, $mailer->pdf->files);

        $this->expectException(BindingResolutionException::class);
        app(\Countable::class);                     // an interface with no binding
    }

    public function test_facade_expectation(): void
    {
        Cache::shouldReceive('put')->once()->with('rates', Mockery::any(), 3600);

        Cache::put('rates', ['usd' => 83], 3600);
    }

    public function test_config_not_env(): void
    {
        $this->assertSame(config('services.razorpay.key'), 'rzp_test_key');
        // env('RAZORPAY_KEY') would also work right now, but returns null once config:cache runs (Topic 75).
    }
}
