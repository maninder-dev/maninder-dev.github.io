<?php

namespace App\Jobs;

use App\Support\Trace;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\Middleware\ThrottlesExceptions;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Topic 60: job middleware. RateLimited uses RateLimiter::for('shipping-api') (AppServiceProvider);
 * jobs over the limit are released back to the queue with a delay instead of running.
 */
class CallShippingApi implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $orderId) {}

    public function middleware(): array
    {
        return [
            new RateLimited('shipping-api'),
            (new WithoutOverlapping($this->orderId))->releaseAfter(30),
            new ThrottlesExceptions(10, 5 * 60),   // back off when the API keeps failing
        ];
    }

    public function handle(): void
    {
        Trace::record("shipped:{$this->orderId}");
    }
}
