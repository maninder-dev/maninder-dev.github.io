<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Storage;

/** Topic 58: the "slow" work a queued job does. Writes a fake PDF to the local disk. */
class PdfService
{
    public function invoice(Order $order): string
    {
        $path = "invoices/order-{$order->id}.pdf";
        Storage::put($path, "%PDF-1.4 invoice for order {$order->id}");

        return $path;
    }
}
