<?php

namespace Tests\Feature\Topics;

use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Topic 023: API Resources (Transformers) (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic023
 *
 * A resource decides the JSON shape: no leaked columns, relations only when eager loaded,
 * counts only when counted, and pagination meta/links added for free.
 */
class Topic023_ApiResourcesTest extends TestCase
{
    use RefreshDatabase;

    public function test_conditional_fields_and_no_leaks(): void
    {
        $post = Post::factory()->create(['body' => str_repeat('a', 200)]);

        $plain = (new PostResource(Post::find($post->id)))->resolve(Request::create('/'));
        $this->assertArrayNotHasKey('author', $plain);            // not loaded -> omitted
        $this->assertArrayNotHasKey('comments_count', $plain);    // not counted -> omitted
        $this->assertArrayNotHasKey('body', $plain);              // never exposed
        $this->assertSame(123, mb_strlen($plain['excerpt']));     // 120 chars + "..."

        $full = (new PostResource(Post::with('author')->withCount('comments')->find($post->id)))->resolve(Request::create('/'));
        $this->assertSame(['id' => $post->user_id, 'name' => $post->author->name], $full['author']->resolve());
        $this->assertSame(0, $full['comments_count']);
    }

    public function test_collection_adds_pagination_meta(): void
    {
        $user = User::factory()->create();
        Post::factory()->count(3)->for($user, 'author')->create();
        $request = Request::create('/api/posts');
        $request->setUserResolver(fn () => $user);

        $json = PostResource::collection(Post::with('author')->withCount('comments')->paginate(2))
            ->response($request)->getData(true);

        $this->assertCount(2, $json['data']);
        $this->assertSame(3, $json['meta']['total']);
        $this->assertArrayHasKey('next', $json['links']);
        $this->assertTrue($json['data'][0]['is_owner']);
        $this->assertArrayNotHasKey('password', $json['data'][0]['author']);
    }
}
