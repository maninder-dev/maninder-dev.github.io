<?php

namespace Tests\Feature\Topics;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Topic 075: Production Optimization Commands (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic075
 *
 * `php artisan optimize` = config:cache + route:cache + view:cache + event:cache. We run the real
 * config:cache, pointed at a temp file (APP_CONFIG_CACHE) so this test run is not affected, and
 * show that .env values are baked into a plain PHP array: after this, .env is never read again.
 * composer --optimize-autoloader and OPcache are deployment settings (see scripts/deploy.sh).
 */
class Topic075_ProductionOptimizationTest extends TestCase
{
    public function test_optimize_commands_exist(): void
    {
        foreach (['optimize', 'optimize:clear', 'config:cache', 'route:cache', 'view:cache', 'event:cache'] as $command) {
            $this->assertArrayHasKey($command, Artisan::all(), $command);
        }
    }

    public function test_config_cache_bakes_env_values_into_one_file(): void
    {
        $_SERVER['APP_CONFIG_CACHE'] = 'storage/framework/testing-config-cache.php';   // relative to base_path()
        $path = base_path($_SERVER['APP_CONFIG_CACHE']);

        try {
            $this->artisan('config:cache')->assertSuccessful();

            $this->assertFileExists($path);
            $cached = require $path;
            $this->assertSame('rzp_test_key', $cached['services']['razorpay']['key']);   // value, not env() call
            $this->assertStringNotContainsString("env('", File::get($path));
        } finally {
            File::delete($path);
            unset($_SERVER['APP_CONFIG_CACHE']);
        }
    }
}
