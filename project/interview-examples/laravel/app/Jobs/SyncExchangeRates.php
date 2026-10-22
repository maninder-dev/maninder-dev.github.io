<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Topic 63: scheduled hourly in routes/console.php. */
class SyncExchangeRates implements ShouldQueue
{
    use Queueable;

    public function handle(): void {}
}
