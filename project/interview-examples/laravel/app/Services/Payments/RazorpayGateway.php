<?php

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use App\Exceptions\CardDeclined;
use App\Models\User;
use Illuminate\Support\Facades\Http;

/** Topics 72, 91: talks to the gateway over HTTP (tests fake it with Http::fake()). */
class RazorpayGateway implements PaymentGateway
{
    public function __construct(public readonly ?string $key = null, public readonly ?string $secret = null) {}

    public function charge(User $user, int $amount, string $idempotencyKey): string
    {
        $response = Http::withBasicAuth((string) $this->key, (string) $this->secret)
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->post('https://api.razorpay.com/v1/payments', ['amount' => $amount, 'email' => $user->email]);

        if ($response->failed() || $response->json('status') !== 'captured') {
            throw new CardDeclined($response->json('error', 'Payment declined.'));
        }

        return $response->json('id');
    }
}
