<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Models\User;
use Illuminate\Support\Str;

/** Topic 4: the container builds this (and the gateway it needs) by reading the constructor. */
class PaymentService
{
    public function __construct(public readonly PaymentGateway $gateway) {}

    public function charge(User $user, int $amount): array
    {
        $id = $this->gateway->charge($user, $amount, (string) Str::uuid());

        return ['payment_id' => $id, 'amount' => $amount];
    }
}
