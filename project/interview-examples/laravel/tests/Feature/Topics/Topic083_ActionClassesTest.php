<?php

namespace Tests\Feature\Topics;

use App\Actions\PublishPost;
use App\Enums\PostStatus;
use App\Events\PostPublished;
use App\Models\Post;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Topic 083: Action Classes (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic083
 *
 * One class, one public method, reusable from controllers, commands, jobs and tests.
 */
class Topic083_ActionClassesTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishes_and_fires_an_event(): void
    {
        Event::fake([PostPublished::class]);
        $post = Post::factory()->create();

        app(PublishPost::class)->execute($post);

        $this->assertSame(PostStatus::Published, $post->fresh()->status);
        $this->assertNotNull($post->fresh()->published_at);
        Event::assertDispatched(PostPublished::class, fn ($e) => $e->post->is($post));
    }

    public function test_refuses_to_publish_twice(): void
    {
        $post = Post::factory()->published()->create();

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('This post is already published.');
        app(PublishPost::class)->execute($post);
    }
}
