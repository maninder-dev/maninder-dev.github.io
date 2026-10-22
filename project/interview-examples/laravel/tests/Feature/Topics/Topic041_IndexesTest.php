<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Connection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Topic 041: Database Indexes and Query Performance (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic041
 *
 * toRawSql to see the SQL, DB::listen to log it, EXPLAIN to see whether an index is used,
 * exists() over count(), and DB::whenQueryingForLongerThan for slow-query alerts.
 * (SQLite's EXPLAIN QUERY PLAN stands in for MySQL's EXPLAIN here.)
 */
class Topic041_IndexesTest extends TestCase
{
    use RefreshDatabase;

    public function test_to_raw_sql_inlines_the_bindings(): void
    {
        $sql = Post::where('status', 'published')->orderByDesc('created_at')->toRawSql();

        $this->assertSame('select * from "posts" where "status" = \'published\' and "posts"."deleted_at" is null order by "created_at" desc', $sql);
    }

    public function test_explain_shows_index_versus_full_scan(): void
    {
        $plan = fn (string $sql) => collect(DB::select("EXPLAIN QUERY PLAN {$sql}"))->pluck('detail')->implode(' | ');

        $this->assertStringContainsString('USING INDEX posts_status_index', $plan("select * from posts where status = 'draft'"));
        $this->assertStringContainsString('SCAN posts', $plan("select * from posts where views > 10"));   // no index on views
    }

    public function test_exists_is_cheaper_than_count(): void
    {
        User::factory()->count(3)->create();

        $queries = $this->queriesDuring(fn () => User::where('active', true)->exists());
        $this->assertStringContainsString('select exists(', $queries[0]);
    }

    public function test_slow_query_detection_fires(): void
    {
        $fired = false;
        DB::whenQueryingForLongerThan(0, function (Connection $connection) use (&$fired) {
            $fired = true;
        });

        DB::select('select 1');
        usleep(2000);
        DB::select('select 1');

        $this->assertTrue($fired);
    }
}
