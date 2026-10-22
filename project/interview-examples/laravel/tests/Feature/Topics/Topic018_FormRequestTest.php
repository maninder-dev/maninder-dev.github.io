<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 018: Form Request Classes (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic018
 *
 * StorePostRequest: authorize() (policy), rules(), custom messages(), prepareForValidation().
 */
class Topic018_FormRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_prepare_for_validation_adds_the_slug(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/posts', ['title' => 'Hello World', 'body' => 'x'])
            ->assertRedirect();

        $this->assertSame('hello-world', Post::first()->slug);
    }

    public function test_custom_message_and_unique_slug_rule(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/posts', ['body' => 'x'])
            ->assertStatus(422)->assertJsonPath('errors.title.0', 'Give your post a title.');

        Post::factory()->create(['title' => 'Taken']);
        $this->actingAs($user)->postJson('/posts', ['title' => 'Taken', 'body' => 'x'])
            ->assertJsonValidationErrors('slug');
    }

    public function test_authorize_false_gives_403(): void
    {
        $this->actingAs(User::factory()->unverified()->create())     // policy: must be verified
            ->post('/posts', ['title' => 'Hi', 'body' => 'x'])
            ->assertForbidden();
    }
}
