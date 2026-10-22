<?php

namespace App\Services;

use App\Contracts\PaymentGateway;

/** Topic 5: receives RazorpayGateway via contextual binding, whatever the default gateway is. */
class InvoiceService
{
    public function __construct(public readonly PaymentGateway $gateway) {}
}
