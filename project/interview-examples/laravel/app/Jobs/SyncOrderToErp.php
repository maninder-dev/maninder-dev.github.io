<?php

namespace App\Jobs;

use App\Models\Order;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Topic 59: only one instance per order may be queued at a time (lock held in the cache). */
class SyncOrderToErp implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $uniqueFor = 600;

    public function __construct(public Order $order) {}

    public function uniqueId(): string
    {
        return (string) $this->order->id;
    }

    public function handle(): void {}
}
