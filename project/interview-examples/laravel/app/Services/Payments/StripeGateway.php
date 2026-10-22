<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Models\User;

/** Topic 91: one implementation of the PaymentGateway contract (offline stub, no network). */
class StripeGateway implements PaymentGateway
{
    public function __construct(public readonly ?string $secret = null) {}

    public function charge(User $user, int $amount, string $idempotencyKey): string
    {
        return 'ch_'.substr(sha1($idempotencyKey), 0, 10);
    }
}
