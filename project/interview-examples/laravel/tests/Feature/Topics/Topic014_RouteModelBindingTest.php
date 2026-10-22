<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 014: Route Model Binding (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic014
 *
 * {post} -> WHERE id = ?, {post:slug} -> WHERE slug = ?, scopeBindings() checks the child
 * belongs to the parent, withTrashed() lets soft-deleted models through. Missing = 404.
 */
class Topic014_RouteModelBindingTest extends TestCase
{
    use RefreshDatabase;

    public function test_binding_by_id_and_by_slug(): void
    {
        $post = Post::factory()->create(['title' => 'Laravel Tips']);

        $this->get("/posts/{$post->id}")->assertOk()->assertSee('Laravel Tips');
        $this->get('/blog/laravel-tips')->assertOk()->assertSee('Laravel Tips');
        $this->get('/blog/nope')->assertNotFound();
        $this->get('/posts/999')->assertNotFound();
    }

    public function test_scoped_bindings_404_when_child_belongs_to_another_parent(): void
    {
        $post = Post::factory()->create();
        $other = Post::factory()->create();
        $mine = $post->comments()->create(['body' => 'mine']);
        $theirs = $other->comments()->create(['body' => 'theirs']);

        $this->get("/posts/{$post->id}/comments/{$mine->id}")->assertOk()->assertSee('mine');
        $this->get("/posts/{$post->id}/comments/{$theirs->id}")->assertNotFound();
    }

    public function test_with_trashed_includes_soft_deleted_models(): void
    {
        $post = Post::factory()->create(['title' => 'Gone']);
        $post->delete();

        $this->get("/posts/{$post->id}")->assertNotFound();
        $this->get("/trash/{$post->id}")->assertOk()->assertSee('Gone');
    }
}
