<?php

namespace App\Exceptions;

use RuntimeException;

/** Topic 24: has a custom report() callback in bootstrap/app.php. */
class PaymentFailed extends RuntimeException
{
    public function __construct(public readonly int $orderId, string $message = 'Payment failed.')
    {
        parent::__construct($message);
    }
}
