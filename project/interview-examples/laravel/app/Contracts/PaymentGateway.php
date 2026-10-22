<?php

namespace App\Contracts;

use App\Models\User;

/** Topics 5, 73, 82, 91: depend on this interface, let the container pick the implementation. */
interface PaymentGateway
{
    /** Returns the gateway's payment id. Throws App\Exceptions\CardDeclined on failure. */
    public function charge(User $user, int $amount, string $idempotencyKey): string;
}
