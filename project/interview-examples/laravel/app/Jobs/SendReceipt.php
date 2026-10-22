<?php

namespace App\Jobs;

use App\Models\Order;
use App\Support\Trace;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Topic 97: the Order is serialized as "Order#id" and re-fetched by the worker.
 * deleteWhenMissingModels: if the order was deleted meanwhile, drop the job silently.
 */
class SendReceipt implements ShouldQueue
{
    use Queueable;

    public bool $deleteWhenMissingModels = true;

    public function __construct(public Order $order) {}

    public function handle(): void
    {
        $this->order->loadMissing('items');
        Trace::record("receipt:{$this->order->id}:status={$this->order->status->value}:items={$this->order->items->count()}");
    }
}
