<?php

namespace Tests\Feature\Topics;

use App\Jobs\CallShippingApi;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\Middleware\ThrottlesExceptions;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Topic 060: Job Middleware and Rate Limiting Jobs (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic060
 *
 * Uses the real "database" queue and a real worker (queue:work --stop-when-empty) in-process.
 * The shipping-api limiter allows 2 jobs per minute, so of 3 jobs, 2 run and 1 is released
 * back to the jobs table with a delay instead of running.
 */
class Topic060_JobMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_middleware_stack(): void
    {
        $middleware = (new CallShippingApi(1))->middleware();

        $this->assertInstanceOf(RateLimited::class, $middleware[0]);
        $this->assertInstanceOf(WithoutOverlapping::class, $middleware[1]);
        $this->assertInstanceOf(ThrottlesExceptions::class, $middleware[2]);
    }

    public function test_rate_limited_jobs_are_released_not_run(): void
    {
        config(['queue.default' => 'database']);

        foreach ([101, 102, 103] as $orderId) {
            CallShippingApi::dispatch($orderId);
        }
        $this->assertSame(3, DB::table('jobs')->count());

        Artisan::call('queue:work', ['connection' => 'database', '--stop-when-empty' => true, '--sleep' => 0]);

        $this->assertSame(['shipped:101', 'shipped:102'], $this->trace());
        $released = DB::table('jobs')->first();
        $this->assertSame(1, DB::table('jobs')->count());
        $this->assertGreaterThan(now()->timestamp, $released->available_at);   // retried later
    }
}
