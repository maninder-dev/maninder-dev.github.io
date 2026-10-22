<?php

namespace App\Jobs;

use App\Support\Trace;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;
use Throwable;

/**
 * Topic 97: retry with backoff; after the last attempt failed() runs and the job lands in failed_jobs.
 * (A retryUntil(): DateTime method would replace $tries with a deadline: retry until that time.)
 */
class SyncToCrm implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [0, 0];   // the real app would use [10, 30, 120, 600]

    public function handle(): void
    {
        Trace::record('crm-attempt');
        throw new RuntimeException('CRM is down');
    }

    public function failed(Throwable $e): void
    {
        Trace::record('crm-failed:'.$e->getMessage());
    }
}
