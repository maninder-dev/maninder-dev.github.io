<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\MissingAttributeException;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 076: Finding Performance Problems (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic076
 *
 * Debugbar/Telescope/Pulse are not installed; Model::shouldBeStrict(! production) in
 * AppServiceProvider makes the most common problems fail fast in development and tests.
 */
class Topic076_FindingPerformanceProblemsTest extends TestCase
{
    use RefreshDatabase;

    public function test_lazy_loading_throws(): void
    {
        Post::factory()->count(2)->create();

        $this->expectException(LazyLoadingViolationException::class);
        foreach (Post::all() as $post) {
            $post->author->name;
        }
    }

    public function test_reading_a_column_you_did_not_select_throws(): void
    {
        User::factory()->create();
        $user = User::select('id')->first();

        $this->expectException(MissingAttributeException::class);
        $user->name;
    }

    public function test_query_count_budget_for_a_page(): void
    {
        Post::factory()->count(5)->create();

        $queries = $this->queriesDuring(fn () => $this->get('/posts')->assertOk());

        $this->assertLessThanOrEqual(3, count($queries));          // count + posts + authors
    }
}
