<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Providers\GeoIpServiceProvider;
use App\Services\GeoIp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Topic 006: Service Providers (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic006
 *
 * register() binds; boot() wires things that need other services (gates, limiters, observers,
 * composers). A DeferrableProvider only loads when one of its bindings is requested.
 */
class Topic006_ServiceProvidersTest extends TestCase
{
    public function test_a_deferred_provider_is_compiled_into_the_deferred_manifest(): void
    {
        // The compiled manifest (bootstrap/cache/services.php) lists deferred services separately.
        // An HTTP request only registers GeoIpServiceProvider when GeoIp is first resolved.
        // (The console kernel, which tests and artisan use, eagerly loads all deferred providers.)
        $manifest = require $this->app->getCachedServicesPath();

        $this->assertSame(GeoIpServiceProvider::class, $manifest['deferred'][GeoIp::class]);
        $this->assertNotContains(GeoIpServiceProvider::class, $manifest['eager']);
        $this->assertSame('IN', app(GeoIp::class)->country());
    }

    public function test_boot_registered_gates_limiters_and_strict_mode(): void
    {
        $this->assertTrue(Gate::has('view-reports'));
        $this->assertNotNull(RateLimiter::limiter('login'));
        $this->assertTrue(Model::preventsLazyLoading());                       // not production
        new Post;                                                              // boots the model + #[ObservedBy]
        $this->assertTrue(Post::getEventDispatcher()->hasListeners('eloquent.creating: '.Post::class));
    }
}
