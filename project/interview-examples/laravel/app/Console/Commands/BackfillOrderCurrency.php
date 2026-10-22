<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;

/**
 * Topic 99: step 2 of a zero-downtime column change on a huge table: backfill in batches by id,
 * one small UPDATE per batch, pausing between batches so the database can breathe.
 */
class BackfillOrderCurrency extends Command
{
    protected $signature = 'orders:backfill-currency {--batch=5000} {--sleep=100 : ms between batches}';

    protected $description = 'Backfill orders.currency in small batches';

    public function handle(): int
    {
        $batches = 0;
        Order::withTrashed()->whereNull('currency')->select('id')->chunkById((int) $this->option('batch'), function ($orders) use (&$batches) {
            Order::withTrashed()->whereKey($orders->modelKeys())->update(['currency' => 'INR']);
            $batches++;
            usleep((int) $this->option('sleep') * 1000);
        });
        $this->info("Backfilled in {$batches} batches.");

        return self::SUCCESS;
    }
}
