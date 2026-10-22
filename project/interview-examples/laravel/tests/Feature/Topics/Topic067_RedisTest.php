<?php

namespace Tests\Feature\Topics;

use App\Services\Leaderboard;
use Illuminate\Support\Facades\Redis;
use Mockery;
use Tests\TestCase;

/**
 * Topic 067: Redis in Laravel (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic067
 *
 * SIMULATED: no Redis server in this environment. App\Services\Leaderboard uses the real Redis
 * facade; the test mocks it with Redis::shouldReceive to assert the exact commands sent
 * (SET .. EX, INCR, ZADD, ZREVRANGE WITHSCORES, pipelining). Config wiring is asserted too.
 */
class Topic067_RedisTest extends TestCase
{
    public function test_commands_sent_to_redis(): void
    {
        Redis::shouldReceive('set')->once()->with('otp:9876543210', '482913', 'EX', 300);
        Redis::shouldReceive('incr')->once()->with('views:post:7')->andReturn(42);
        Redis::shouldReceive('zadd')->once()->with('leaderboard', 1500, 'alice');
        Redis::shouldReceive('zrevrange')->once()->with('leaderboard', 0, 9, ['WITHSCORES' => true])->andReturn(['alice' => 1500]);

        $board = new Leaderboard;
        $board->storeOtp('9876543210', '482913');
        $this->assertSame(42, $board->recordView(7));
        $board->score('alice', 1500);
        $this->assertSame(['alice' => 1500], $board->top());
    }

    public function test_pipeline_batches_commands_in_one_round_trip(): void
    {
        $pipe = Mockery::mock();
        $pipe->shouldReceive('set')->times(1000);
        Redis::shouldReceive('pipeline')->once()->andReturnUsing(fn (callable $callback) => $callback($pipe));

        (new Leaderboard)->warm(1000);
    }

    public function test_redis_is_wired_for_cache_queue_and_sessions(): void
    {
        $this->assertSame('redis', config('cache.stores.redis.driver'));
        $this->assertSame('redis', config('queue.connections.redis.driver'));
        $this->assertSame('127.0.0.1', config('database.redis.default.host'));
    }
}
