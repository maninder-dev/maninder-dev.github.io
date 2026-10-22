<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Topic 013: Route Groups, Prefixes and Fallbacks (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic013
 */
class Topic013_RouteGroupsTest extends TestCase
{
    use RefreshDatabase;

    public function test_group_shares_prefix_name_and_middleware(): void
    {
        $route = Route::getRoutes()->getByName('dashboard.projects.index');

        $this->assertSame('dashboard/projects', $route->uri());
        $this->assertSame(['web', 'auth', 'verified'], $route->gatherMiddleware());

        $this->get('/dashboard/projects')->assertRedirect('/login');                    // auth
        $this->actingAs(User::factory()->unverified()->create())
            ->get('/dashboard/projects')->assertRedirect('/email/verify');               // verified
        $this->actingAs(User::factory()->create())->get('/dashboard/projects')->assertOk();
    }

    public function test_subdomain_routing(): void
    {
        $this->get('http://acme.myapp.test/')->assertSee('Workspace: acme');
    }

    public function test_fallback_renders_the_404_view(): void
    {
        $this->get('/no/such/page')->assertNotFound()->assertSee('Page not found');
    }
}
