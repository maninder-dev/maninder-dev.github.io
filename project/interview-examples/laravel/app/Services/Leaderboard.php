<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;

/** Topic 67: typical Redis uses (OTP with expiry, counters, sorted-set leaderboard, pipelining). */
class Leaderboard
{
    public function storeOtp(string $phone, string $code): void
    {
        Redis::set("otp:{$phone}", $code, 'EX', 300);
    }

    public function recordView(int $postId): int
    {
        return Redis::incr("views:post:{$postId}");
    }

    public function score(string $player, int $points): void
    {
        Redis::zadd('leaderboard', $points, $player);
    }

    public function top(int $n = 10): array
    {
        return Redis::zrevrange('leaderboard', 0, $n - 1, ['WITHSCORES' => true]);
    }

    public function warm(int $count): void
    {
        Redis::pipeline(function ($pipe) use ($count) {
            foreach (range(1, $count) as $i) {
                $pipe->set("key:{$i}", $i);
            }
        });
    }
}
