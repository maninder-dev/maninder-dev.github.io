<?php

namespace Tests\Feature\Topics;

use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Topic 079: Logging (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic079
 *
 * Structured context, shared context (withContext) and channels. Logs go to the "null" channel
 * here; we capture them through the MessageLogged event.
 */
class Topic079_LoggingTest extends TestCase
{
    public function test_structured_and_shared_context(): void
    {
        config(['logging.default' => 'null']);
        $logged = [];
        Event::listen(MessageLogged::class, function (MessageLogged $e) use (&$logged) {
            $logged[] = $e;
        });

        $requestId = (string) Str::uuid();
        Log::withContext(['request_id' => $requestId]);
        Log::info('Order placed', ['order_id' => 42, 'user_id' => 7]);
        Log::warning('Stock low');

        $this->assertSame('info', $logged[0]->level);
        $this->assertSame(['request_id' => $requestId, 'order_id' => 42, 'user_id' => 7], $logged[0]->context);
        $this->assertSame($requestId, $logged[1]->context['request_id']);   // added to every line
    }

    public function test_channels_are_configured(): void
    {
        $this->assertSame('stack', config('logging.channels.stack.driver'));
        $this->assertSame('daily', config('logging.channels.daily.driver'));
        $this->assertArrayHasKey('slack', config('logging.channels'));
        $this->assertArrayHasKey('stderr', config('logging.channels'));
    }
}
