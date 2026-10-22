<?php

namespace Tests\Feature\Topics;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 061: Horizon and Queue Monitoring (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic061
 *
 * CONFIG ONLY: laravel/horizon is not installed (it needs a Redis server). config/horizon.php
 * holds the supervisor setup; this test asserts it is wired and sensible. Inspect failures
 * locally with `php artisan queue:failed` / `queue:retry all`, which work without Horizon.
 */
class Topic061_HorizonTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_supervisor_is_auto_balanced_on_redis(): void
    {
        $supervisor = config('horizon.environments.production.supervisor-1');

        $this->assertSame('redis', $supervisor['connection']);
        $this->assertSame(['high', 'default'], $supervisor['queue']);           // priority order
        $this->assertSame('auto', $supervisor['balance']);
        $this->assertSame([2, 20, 3], [$supervisor['minProcesses'], $supervisor['maxProcesses'], $supervisor['tries']]);
        $this->assertSame(['mail'], config('horizon.environments.production.mail-supervisor.queue'));
    }

    public function test_queue_redis_connection_and_failed_job_storage_exist(): void
    {
        $this->assertSame('redis', config('queue.connections.redis.driver'));
        $this->assertSame('failed_jobs', config('queue.failed.table'));
        $this->artisan('queue:failed')->assertSuccessful();
    }
}
