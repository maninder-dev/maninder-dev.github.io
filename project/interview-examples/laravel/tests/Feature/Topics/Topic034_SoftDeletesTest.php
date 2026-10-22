<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 034: Soft Deletes (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic034
 *
 * delete() sets deleted_at; normal queries hide the row; withTrashed/onlyTrashed/restore/
 * forceDelete; the Prunable trait + `php artisan model:prune` clears old trash.
 */
class Topic034_SoftDeletesTest extends TestCase
{
    use RefreshDatabase;

    public function test_soft_delete_restore_and_force_delete(): void
    {
        $post = Post::factory()->create();
        $post->delete();

        $this->assertTrue($post->trashed());
        $this->assertSame(0, Post::count());
        $this->assertSame(1, Post::withTrashed()->count());
        $this->assertSame(1, Post::onlyTrashed()->count());
        $this->assertDatabaseHas('posts', ['id' => $post->id]);             // row is still there

        $post->restore();
        $this->assertSame(1, Post::count());

        $post->forceDelete();
        $this->assertDatabaseMissing('posts', ['id' => $post->id]);
    }

    public function test_prune_removes_only_old_trash(): void
    {
        $old = Post::factory()->create();
        $recent = Post::factory()->create();
        $live = Post::factory()->create();

        $this->travel(-40)->days();
        $old->delete();
        $this->travelBack();
        $recent->delete();

        $this->artisan('model:prune', ['--model' => [Post::class]])->assertSuccessful();

        $this->assertDatabaseMissing('posts', ['id' => $old->id]);
        $this->assertSoftDeleted($recent);
        $this->assertNotSoftDeleted($live);
    }
}
