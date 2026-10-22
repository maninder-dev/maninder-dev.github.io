<?php

namespace Tests\Feature\Topics;

use App\Enums\PostStatus;
use App\Models\Post;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Topic 025: Eloquent Models (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic025
 *
 * Active Record: Post maps to the posts table, each instance to a row; casts() turns columns
 * into PHP types (datetime, array, enum, boolean).
 */
class Topic025_EloquentModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_crud_and_casts(): void
    {
        $user = User::factory()->create();
        $post = $user->posts()->create([
            'title' => 'Hello', 'body' => '...', 'status' => 'published',
            'published_at' => '2026-01-01 10:00:00', 'meta' => ['lang' => 'en'], 'is_featured' => 1,
        ]);

        $fresh = Post::findOrFail($post->id);
        $this->assertSame('posts', $fresh->getTable());
        $this->assertSame(PostStatus::Published, $fresh->status);          // enum
        $this->assertInstanceOf(Carbon::class, $fresh->published_at);      // datetime
        $this->assertSame(['lang' => 'en'], $fresh->meta);                 // array (stored as JSON)
        $this->assertTrue($fresh->is_featured);                            // boolean

        $fresh->update(['title' => 'Hello again']);
        $this->assertSame('Hello again', Post::find($post->id)->title);

        $fresh->delete();
        $this->expectException(ModelNotFoundException::class);
        Post::findOrFail($post->id);
    }

    public function test_bulk_delete_with_a_query(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-06-01'));
        Post::factory()->count(2)->create(['created_at' => now()->subMonths(2)]);
        Post::factory()->create();

        $deleted = Post::where('status', 'draft')->where('created_at', '<', now()->subMonth())->delete();

        $this->assertSame(2, $deleted);
        $this->assertSame(1, Post::count());
    }
}
