<?php

namespace Tests\Feature\Topics;

use App\Facades\Currency;
use App\Services\CurrencyConverter;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Topic 007: Facades (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic007
 *
 * A facade is a static-looking proxy: Cache::get() calls app('cache')->get() via __callStatic.
 * Because the real object lives in the container, facades can be mocked.
 */
class Topic007_FacadesTest extends TestCase
{
    public function test_a_facade_proxies_to_the_container_object(): void
    {
        Cache::put('stats', ['users' => 5], now()->addMinutes(10));

        $this->assertSame(['users' => 5], app('cache')->get('stats'));
        $this->assertSame(app('cache'), Cache::getFacadeRoot());
    }

    public function test_a_custom_facade_resolves_its_accessor(): void
    {
        $this->assertSame(app(CurrencyConverter::class), Currency::getFacadeRoot());
        $this->assertSame(12.05, Currency::toUsd(100_000));
    }

    public function test_facades_can_be_mocked_with_should_receive(): void
    {
        Cache::shouldReceive('get')->once()->with('stats')->andReturn(['users' => 99]);

        $this->assertSame(['users' => 99], Cache::get('stats'));
    }

    public function test_real_time_facades_make_any_class_static(): void
    {
        $this->assertSame(1.2, \Facades\App\Services\CurrencyConverter::toUsd(9_960));
    }
}
