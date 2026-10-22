<?php

namespace Tests\Feature\Topics;

use App\Providers\AppServiceProvider;
use Tests\TestCase;

/**
 * Topic 003: The Request Lifecycle (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic003
 *
 * index.php -> bootstrap/app.php -> kernel (providers registered + booted) -> middleware ->
 * router -> controller -> response back out through middleware -> terminate().
 */
class Topic003_RequestLifecycleTest extends TestCase
{
    public function test_providers_boot_before_the_request_and_middleware_wraps_the_controller(): void
    {
        $this->assertTrue($this->app->isBooted());
        $this->assertArrayHasKey(AppServiceProvider::class, $this->app->getLoadedProviders());

        $this->get('/lifecycle')->assertOk()->assertSee('ok');

        $this->assertSame(
            ['middleware:before', 'controller', 'middleware:after', 'terminate'],
            $this->trace(),
        );
    }
}
