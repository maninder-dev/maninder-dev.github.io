<?php

namespace Tests\Feature\Topics;

use App\Http\Controllers\ShowDashboard;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Topic 015: Controllers and Resource Controllers (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic015
 *
 * Route::resource gives 7 conventional routes; apiResource gives 5 (no create/edit forms);
 * an invokable controller handles a single action.
 */
class Topic015_ResourceControllersTest extends TestCase
{
    use RefreshDatabase;

    public function test_resource_registers_the_seven_named_routes(): void
    {
        $expected = [
            'posts.index' => ['GET', 'posts'], 'posts.create' => ['GET', 'posts/create'],
            'posts.store' => ['POST', 'posts'], 'posts.show' => ['GET', 'posts/{post}'],
            'posts.edit' => ['GET', 'posts/{post}/edit'], 'posts.update' => ['PUT', 'posts/{post}'],
            'posts.destroy' => ['DELETE', 'posts/{post}'],
        ];
        foreach ($expected as $name => [$verb, $uri]) {
            $route = Route::getRoutes()->getByName($name);
            $this->assertSame($uri, $route->uri(), $name);
            $this->assertContains($verb, $route->methods(), $name);
        }
    }

    public function test_api_resource_has_no_create_or_edit(): void
    {
        $names = collect(Route::getRoutes()->getRoutes())->map->getName()->filter(fn ($n) => str_starts_with((string) $n, 'orders.'));

        $this->assertEqualsCanonicalizing(['orders.index', 'orders.store', 'orders.destroy', 'orders.show'], $names->values()->all());
        $this->assertNull(Route::getRoutes()->getByName('orders.create'));
    }

    public function test_store_redirects_with_a_flash_message_and_destroy_works(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/posts', ['title' => 'Hello', 'body' => 'First post']);
        $post = Post::firstWhere('title', 'Hello');
        $response->assertRedirect(route('posts.show', $post))->assertSessionHas('status', 'Post published.');

        $this->delete("/posts/{$post->id}")->assertRedirect(route('posts.index'));
        $this->assertSoftDeleted($post);
    }

    public function test_single_action_controller(): void
    {
        $this->assertSame(ShowDashboard::class, Route::getRoutes()->getByName('dashboard')->getActionName());
        $this->actingAs(User::factory()->create(['name' => 'Ann']))->get('/dashboard')->assertSee('Welcome, Ann');
    }
}
