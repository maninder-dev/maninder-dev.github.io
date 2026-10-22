<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use App\Policies\PostPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

/**
 * Topic 051: Authorization: Policies (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic051
 *
 * PostPolicy is auto-discovered; Response::deny carries a message; ->can('update', 'post')
 * on a route gives 403 to non-owners.
 */
class Topic051_PoliciesTest extends TestCase
{
    use RefreshDatabase;

    public function test_policy_is_discovered_by_convention(): void
    {
        $this->assertInstanceOf(PostPolicy::class, Gate::getPolicyFor(Post::class));
    }

    public function test_only_the_owner_can_update(): void
    {
        $owner = User::factory()->create();
        $post = Post::factory()->for($owner, 'author')->create();

        $this->actingAs(User::factory()->create())->patch("/posts/{$post->id}/title")->assertForbidden();
        $this->actingAs($owner)->patch("/posts/{$post->id}/title")->assertOk();
        $this->actingAs($owner)->put("/posts/{$post->id}", ['title' => 'Renamed'])->assertRedirect();
        $this->assertSame('Renamed', $post->fresh()->title);
    }

    public function test_deny_response_message_and_admin_override(): void
    {
        $post = Post::factory()->create();
        $stranger = User::factory()->create();

        $response = Gate::forUser($stranger)->inspect('delete', $post);
        $this->assertFalse($response->allowed());
        $this->assertSame('You can only delete your own posts.', $response->message());

        $this->actingAs($stranger)->deleteJson("/posts/{$post->id}")
            ->assertForbidden()->assertJsonPath('message', 'You can only delete your own posts.');

        $this->assertTrue(Gate::forUser(User::factory()->admin()->create())->allows('delete', $post));
    }
}
