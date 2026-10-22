<?php

namespace Tests\Feature\Topics;

use App\Http\Middleware\EnsureUserIsSubscribed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Topic 020: Middleware (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic020
 *
 * EnsureUserIsSubscribed takes a parameter (subscribed:pro), can short-circuit with a redirect
 * ("before") and adds a header to the response ("after"). Aliased in bootstrap/app.php.
 */
class Topic020_MiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_before_short_circuits_when_not_subscribed(): void
    {
        $this->actingAs(User::factory()->create(['plan' => 'basic']))
            ->get('/reports')
            ->assertRedirect(route('billing'))
            ->assertSessionHas('status', 'Upgrade to access this page.');
    }

    public function test_after_adds_a_header_when_allowed(): void
    {
        $this->actingAs(User::factory()->create(['plan' => 'pro']))
            ->get('/reports')
            ->assertOk()
            ->assertSee('pro reports')
            ->assertHeader('X-Plan', 'pro');
    }

    public function test_alias_and_global_web_middleware(): void
    {
        $this->assertSame(EnsureUserIsSubscribed::class, Route::getMiddleware()['subscribed']);
        $this->get('/hello')->assertHeader('X-Frame-Options', 'DENY');   // SecurityHeaders appended to "web"
    }
}
