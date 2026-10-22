<?php

namespace App\Jobs;

use App\Support\Trace;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;

/**
 * Topic 59: one step of a podcast pipeline (process -> optimize -> publish).
 * Used in a Bus::chain (runs in order, stops on failure) and in a Bus::batch.
 */
class PodcastStep implements ShouldQueue
{
    use Batchable, Queueable;

    public function __construct(public string $step, public bool $fail = false) {}

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if ($this->fail) {
            throw new RuntimeException("{$this->step} failed");
        }

        Trace::record($this->step);
    }
}
