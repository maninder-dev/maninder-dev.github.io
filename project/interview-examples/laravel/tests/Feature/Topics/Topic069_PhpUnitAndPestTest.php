<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 069: Testing in Laravel: PHPUnit and Pest (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic069        (all tests: php artisan test --parallel)
 *
 * This app uses PHPUnit. Pest is NOT installed; the same two tests in Pest syntax would be:
 *
 *   it('lets an author publish a post', function () {
 *       $user = User::factory()->create();
 *       $this->actingAs($user)->post('/posts', ['title' => 'Hello', 'body' => 'First post'])
 *           ->assertRedirect()->assertSessionHas('status', 'Post published.');
 *       expect(Post::where('title', 'Hello')->exists())->toBeTrue();
 *   });
 *
 *   it('blocks guests from creating posts', function () {
 *       $this->post('/posts', ['title' => 'x'])->assertRedirect('/login');
 *   });
 */
class Topic069_PhpUnitAndPestTest extends TestCase
{
    use RefreshDatabase;

    public function test_lets_an_author_publish_a_post(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/posts', ['title' => 'Hello', 'body' => 'First post'])
            ->assertRedirect()
            ->assertSessionHas('status', 'Post published.');

        $this->assertTrue(Post::where('title', 'Hello')->exists());
    }

    public function test_blocks_guests_from_creating_posts(): void
    {
        $this->post('/posts', ['title' => 'x'])->assertRedirect('/login');
        $this->assertSame(0, Post::count());
    }
}
