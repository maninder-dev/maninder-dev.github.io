<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 078: Sessions and Stateless Scaling (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic078
 *
 * CONFIG ONLY: behind a load balancer nothing user-specific may live on one server's disk.
 * We load the real config files with production-style environment variables and check every
 * piece of state moves to a shared service (Redis, S3, stderr).
 */
class Topic078_StatelessScalingTest extends TestCase
{
    public function test_env_switches_every_store_to_a_shared_service(): void
    {
        $env = ['SESSION_DRIVER' => 'redis', 'CACHE_STORE' => 'redis', 'QUEUE_CONNECTION' => 'redis',
            'FILESYSTEM_DISK' => 's3', 'LOG_CHANNEL' => 'stderr'];
        $previous = array_intersect_key($_SERVER, $env);
        $_SERVER = array_merge($_SERVER, $env);

        try {
            $this->assertSame('redis', (require config_path('session.php'))['driver']);
            $this->assertSame('redis', (require config_path('cache.php'))['default']);
            $this->assertSame('redis', (require config_path('queue.php'))['default']);
            $this->assertSame('s3', (require config_path('filesystems.php'))['default']);
            $logging = require config_path('logging.php');
            $this->assertSame('stderr', $logging['default']);
            $this->assertSame('php://stderr', $logging['channels']['stderr']['handler_with']['stream']);
        } finally {
            foreach ($env as $key => $value) {
                unset($_SERVER[$key]);
            }
            $_SERVER = array_merge($_SERVER, $previous);
        }
    }

    public function test_scheduled_tasks_run_on_one_server(): void
    {
        $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events());

        $this->assertTrue($events->contains(fn ($e) => $e->onOneServer));
    }
}
