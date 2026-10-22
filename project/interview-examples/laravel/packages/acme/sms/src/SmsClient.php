<?php

namespace Acme\Sms;

use Illuminate\Support\Facades\DB;

/** Sends (well, records) an SMS. A real client would call a provider's HTTP API. */
class SmsClient
{
    public function __construct(public readonly string $key, public readonly string $sender) {}

    public function send(string $to, string $message): void
    {
        DB::table('sms_logs')->insert(['to' => $to, 'message' => $message, 'created_at' => now()]);
    }
}
