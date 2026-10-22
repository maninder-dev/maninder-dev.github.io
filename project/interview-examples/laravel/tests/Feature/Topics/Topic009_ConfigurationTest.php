<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 009: Configuration and Environment (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic009
 *
 * .env -> config/*.php (env() only there) -> config() everywhere else.
 * After `php artisan config:cache`, Laravel loads bootstrap/cache/config.php and never reads
 * .env again, so env() in app code returns null. We do not run config:cache here (it would
 * freeze this test run's config); instead we show where the cache lives and why config() is safe.
 */
class Topic009_ConfigurationTest extends TestCase
{
    public function test_config_reads_values_that_came_from_the_environment(): void
    {
        // phpunit.xml sets RAZORPAY_KEY, config/services.php maps it
        $this->assertSame('rzp_test_key', config('services.razorpay.key'));
        $this->assertSame('testing', app()->environment());
        $this->assertTrue(app()->environment(['testing', 'local']));
        $this->assertFalse(app()->isProduction());
    }

    public function test_config_can_be_overridden_at_runtime_but_env_cannot_be_trusted_after_caching(): void
    {
        config(['services.razorpay.key' => 'rzp_live_key']);
        $this->assertSame('rzp_live_key', config('services.razorpay.key'));

        // The cached config file is a plain PHP array; env() is not consulted once it exists.
        $this->assertFalse(app()->configurationIsCached());
        $this->assertStringEndsWith('bootstrap/cache/config.php', str_replace('\\', '/', app()->getCachedConfigPath()));
    }

    public function test_app_code_never_calls_env(): void
    {
        $offenders = [];
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(app_path())) as $file) {
            if ($file->getExtension() === 'php' && preg_match('/\benv\(/', file_get_contents($file->getPathname()))) {
                $offenders[] = $file->getFilename();
            }
        }
        $this->assertSame([], $offenders);
    }
}
