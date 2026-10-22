<?php

namespace Tests\Feature\Topics;

use Illuminate\Support\Defer\DeferredCallbackCollection;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Topic 066: Caching (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic066
 *
 * remember (read-through), forever/forget/increment, tags (the array store supports them, like
 * redis/memcached), flexible (stale-while-revalidate) and once() per-request memoization.
 */
class Topic066_CachingTest extends TestCase
{
    public function test_remember_runs_the_closure_only_on_a_miss(): void
    {
        $calls = 0;
        $compute = function () use (&$calls) {
            $calls++;

            return ['users' => 10];
        };

        Cache::remember('dashboard:stats', now()->addMinutes(10), $compute);
        Cache::remember('dashboard:stats', now()->addMinutes(10), $compute);
        $this->assertSame(1, $calls);

        $this->travel(11)->minutes();                               // TTL expired
        Cache::remember('dashboard:stats', now()->addMinutes(10), $compute);
        $this->assertSame(2, $calls);
    }

    public function test_forever_forget_increment(): void
    {
        Cache::forever('settings', ['theme' => 'dark']);
        Cache::increment('page_views');
        Cache::increment('page_views');

        $this->assertSame(2, Cache::get('page_views'));
        Cache::forget('settings');
        $this->assertNull(Cache::get('settings'));
    }

    public function test_tags_flush_a_group(): void
    {
        Cache::tags(['posts', 'user:1'])->put('user:1:posts', ['a'], 600);
        Cache::tags(['posts', 'user:2'])->put('user:2:posts', ['b'], 600);
        Cache::tags(['users'])->put('user:1:profile', ['p'], 600);

        Cache::tags('posts')->flush();

        $this->assertNull(Cache::tags(['posts', 'user:1'])->get('user:1:posts'));
        $this->assertNull(Cache::tags(['posts', 'user:2'])->get('user:2:posts'));
        $this->assertSame(['p'], Cache::tags(['users'])->get('user:1:profile'));
    }

    public function test_flexible_serves_stale_then_refreshes_in_the_background(): void
    {
        $version = 0;
        $build = function () use (&$version) {
            return 'v'.++$version;
        };

        $this->assertSame('v1', Cache::flexible('top-products', [300, 600], $build));

        $this->travel(400)->seconds();                              // stale but within grace
        $this->assertSame('v1', Cache::flexible('top-products', [300, 600], $build));   // instant, stale
        app(DeferredCallbackCollection::class)->invoke();           // what runs after the response
        $this->assertSame('v2', Cache::flexible('top-products', [300, 600], $build));
    }

    public function test_once_memoizes_within_the_request(): void
    {
        $service = new class
        {
            public int $queries = 0;

            public function currentUser(): array
            {
                return once(function () {
                    $this->queries++;

                    return ['id' => 1];
                });
            }
        };

        $service->currentUser();
        $service->currentUser();
        $this->assertSame(1, $service->queries);
    }
}
