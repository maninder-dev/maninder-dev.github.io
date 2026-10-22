<?php

namespace Acme\Sms\Commands;

use Acme\Sms\SmsClient;
use Illuminate\Console\Command;

class SendTestSms extends Command
{
    protected $signature = 'sms:test {to}';

    protected $description = 'Send a test SMS';

    public function handle(SmsClient $sms): int
    {
        $sms->send($this->argument('to'), 'Test message from Acme SMS');
        $this->info('Sent.');

        return self::SUCCESS;
    }
}
