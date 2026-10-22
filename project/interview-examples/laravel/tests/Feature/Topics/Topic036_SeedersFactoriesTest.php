<?php

namespace Tests\Feature\Topics;

use App\Enums\PostStatus;
use App\Models\Post;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 036: Seeders and Factories (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic036
 */
class Topic036_SeedersFactoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_default_and_named_state(): void
    {
        $draft = Post::factory()->create();
        $published = Post::factory()->published()->create();

        $this->assertSame(PostStatus::Draft, $draft->status);
        $this->assertSame(PostStatus::Published, $published->status);
        $this->assertNotNull($published->published_at);
        $this->assertNotNull($draft->author);                               // User::factory() made the parent
    }

    public function test_database_seeder(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(10, User::count());
        $this->assertSame(50, Post::where('status', 'published')->count());
        $this->assertTrue(User::withCount('posts')->get()->every(fn ($u) => $u->posts_count === 5));
    }
}
