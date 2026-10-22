<?php

namespace App\Listeners;

use App\Events\OrderPlaced;
use App\Support\Trace;

/** Topic 62: a second, synchronous listener for the same event. */
class RecordOrderAnalytics
{
    public function handle(OrderPlaced $event): void
    {
        Trace::record("analytics:order-{$event->order->id}");
    }
}
