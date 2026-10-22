<?php

namespace App\Providers;

use App\Services\GeoIp;
use Illuminate\Contracts\Support\DeferrableProvider;
use Illuminate\Support\ServiceProvider;

/** Topic 6: a deferred provider. Laravel loads it only when GeoIp is first resolved. */
class GeoIpServiceProvider extends ServiceProvider implements DeferrableProvider
{
    public function register(): void
    {
        $this->app->singleton(GeoIp::class, fn () => new GeoIp(config('services.geoip.key')));
    }

    public function provides(): array
    {
        return [GeoIp::class];
    }
}
