<?php

namespace Tests\Feature\Topics;

use App\Providers\AppServiceProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Topic 105: Scenario: Securing a Laravel Application (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic105
 *
 * Boots AppServiceProvider as if in production and checks the hardening: HTTPS URLs and
 * destructive commands (db:wipe, migrate:fresh) refused. Plus security headers and throttled login.
 * Other checklist items have their own topics: validation 17-19, policies 51, hashing 53, uploads 54.
 */
class Topic105_SecuringTheAppTest extends TestCase
{
    public function test_production_hardening(): void
    {
        $this->app['env'] = 'production';
        (new AppServiceProvider($this->app))->boot();

        try {
            $this->assertStringStartsWith('https://', url('/posts'));
            $this->assertSame(1, Artisan::call('db:wipe', ['--force' => true]));   // prohibited -> FAILURE
            $this->assertFalse(Model::preventsLazyLoading());                        // strict mode is dev-only
        } finally {
            $this->app['env'] = 'testing';
            URL::forceScheme(null);
            DB::prohibitDestructiveCommands(false);
            Model::shouldBeStrict();
        }
    }

    public function test_security_headers_and_throttled_login(): void
    {
        $this->get('/hello')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        $login = Route::getRoutes()->match(request()->create('/login', 'POST'));
        $this->assertContains('throttle:login', $login->gatherMiddleware());
    }

    public function test_debug_mode_hides_internals(): void
    {
        config(['app.debug' => false]);

        $this->getJson('/api/boom')->assertStatus(500)->assertJsonMissingPath('trace')->assertJsonMissingPath('exception');
    }
}
