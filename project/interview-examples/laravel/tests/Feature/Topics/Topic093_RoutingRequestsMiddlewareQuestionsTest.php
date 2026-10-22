<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Topic 093: Routing, Requests and Middleware Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic093
 */
class Topic093_RoutingRequestsMiddlewareQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_slug_binding_runs_a_where_slug_query(): void
    {
        Post::factory()->create(['title' => 'Laravel Tips']);

        $queries = $this->queriesDuring(fn () => $this->get('/blog/laravel-tips')->assertOk());

        $this->assertTrue(collect($queries)->contains(fn ($q) => str_contains($q, 'where "slug" = ?')));
    }

    public function test_unique_rule_ignores_the_current_user(): void
    {
        $me = User::factory()->create(['email' => 'me@example.com']);
        User::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($me)->put('/profile', ['name' => 'Me', 'email' => 'me@example.com'])->assertSessionHasNoErrors();
        $this->actingAs($me)->put('/profile', ['name' => 'Me', 'email' => 'taken@example.com'])->assertSessionHasErrors('email');
    }

    public function test_variadic_middleware_parameters(): void
    {
        foreach (['admin' => 200, 'analyst' => 200, 'member' => 403] as $role => $status) {
            $user = User::factory()->create();
            $user->forceFill(['role' => $role])->save();
            $this->actingAs($user)->get('/analyst-area')->assertStatus($status);
        }
    }

    public function test_web_group_has_sessions_and_csrf_api_group_does_not(): void
    {
        $web = Route::getRoutes()->match(request()->create('/profile', 'POST'))->gatherMiddleware();
        $api = Route::getRoutes()->match(request()->create('/api/users', 'POST'))->gatherMiddleware();

        $this->assertContains('web', $web);
        $this->assertNotContains('web', $api);
        $this->assertContains('api', $api);
        $this->assertNotEmpty($this->get('/hello')->headers->getCookies());     // session + XSRF cookies
        $this->assertEmpty($this->getJson('/api/teapot')->headers->getCookies());
    }

    public function test_consistent_json_errors(): void
    {
        $this->getJson('/api/boom')->assertStatus(500)->assertExactJson(['message' => 'Something went wrong.']);   // no leak
        $this->getJson('/api/teapot')->assertStatus(418)->assertExactJson(['message' => 'I am a teapot']);
        $this->postJson('/api/users', [])->assertStatus(422)->assertJsonStructure(['message', 'errors']);
    }
}
