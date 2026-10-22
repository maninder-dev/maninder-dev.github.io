<?php

namespace Tests\Feature\Topics;

use App\Jobs\NotifyFollowers;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Topic 033: Model Events and Observers (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic033
 *
 * PostObserver (#[ObservedBy]): creating sets the slug, updated queues NotifyFollowers when the
 * post becomes published, deleted forgets the cache. Mass updates fire NO model events.
 */
class Topic033_ObserversTest extends TestCase
{
    use RefreshDatabase;

    public function test_observer_hooks(): void
    {
        Queue::fake();

        $post = Post::factory()->create(['title' => 'My First Post']);
        $this->assertSame('my-first-post', $post->slug);                     // creating

        $post->update(['status' => 'published']);
        Queue::assertPushed(NotifyFollowers::class, fn ($job) => $job->post->is($post));   // updated

        Cache::put("post:{$post->id}", 'cached');
        $post->delete();
        $this->assertFalse(Cache::has("post:{$post->id}"));                   // deleted
    }

    public function test_mass_updates_skip_model_events(): void
    {
        Queue::fake();
        Post::factory()->count(3)->create();

        $affected = Post::where('status', 'draft')->update(['status' => 'published']);

        $this->assertSame(3, $affected);
        Queue::assertNothingPushed();                                          // observer never ran
    }
}
