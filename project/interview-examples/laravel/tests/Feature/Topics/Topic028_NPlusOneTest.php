<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 028: The N+1 Problem and Eager Loading (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic028
 *
 * Counts queries with DB::listen: lazy loading = 1 + N queries, eager loading = 2.
 * (Lazy loading is switched off in this app by Model::shouldBeStrict(), so the "bad" version
 * temporarily turns the guard off to measure it.)
 */
class Topic028_NPlusOneTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Post::factory()->count(10)->create();      // 10 posts, 10 different authors
    }

    public function test_lazy_loading_runs_one_query_per_post(): void
    {
        Model::preventLazyLoading(false);
        try {
            $queries = $this->queriesDuring(function () {
                foreach (Post::all() as $post) {
                    $post->author->name;
                }
            });
        } finally {
            Model::preventLazyLoading(true);
        }

        $this->assertCount(11, $queries);           // 1 + 10
    }

    public function test_eager_loading_runs_two_queries(): void
    {
        $queries = $this->queriesDuring(function () {
            foreach (Post::with('author')->get() as $post) {
                $post->author->name;
            }
        });

        $this->assertCount(2, $queries);
        $this->assertStringContainsString('"users"."id" in', $queries[1]);
    }

    public function test_constrained_column_and_count_loading(): void
    {
        $posts = Post::with(['author:id,name', 'comments' => fn ($q) => $q->latest()->limit(5)])->get();
        $this->assertSame(['id', 'name'], array_keys($posts->first()->author->getAttributes()));

        $users = User::withCount('posts')->get();
        $this->assertSame(1, $users->first()->posts_count);       // a subquery, rows never loaded

        $posts->loadMissing('author');                             // already loaded: no query
        $this->assertCount(0, $this->queriesDuring(fn () => $posts->loadMissing('author')));
    }
}
