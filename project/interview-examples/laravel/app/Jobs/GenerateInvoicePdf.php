<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\PdfService;
use App\Support\Trace;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Topic 58: retries, timeout, backoff, a failed() hook; handle() dependencies are injected. */
class GenerateInvoicePdf implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 120;

    public array $backoff = [10, 60, 300];   // seconds between retries

    public function __construct(public Order $order) {}  // stored as Order#id, re-fetched by the worker

    public function handle(PdfService $pdf): void
    {
        $path = $pdf->invoice($this->order);
        $this->order->update(['invoice_path' => $path]);
    }

    public function failed(Throwable $e): void
    {
        Trace::record("invoice-failed:{$this->order->id}:{$e->getMessage()}");
    }
}
