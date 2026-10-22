<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use App\Services\CartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Topic 077: Laravel Octane (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic077
 *
 * SIMULATED: laravel/octane is not installed. Octane keeps ONE application in memory and, between
 * requests, swaps in the new Request and calls forgetScopedInstances(). We do exactly that for two
 * users and show the singleton leaking user A into user B's request while scoped() stays correct.
 */
class Topic077_OctaneTest extends TestCase
{
    use RefreshDatabase;

    private function simulateRequest(User $user): void
    {
        $this->app->instance('request', Request::create('/cart'));   // new request object
        $this->app['auth']->forgetGuards();                          // fresh auth state
        $this->app->forgetScopedInstances();                           // what Octane does per request
        $this->actingAs($user);                                         // this request's user
    }

    public function test_singleton_leaks_state_between_requests(): void
    {
        $this->app->singleton('cart.singleton', fn ($app) => new CartService($app['request']->user()));
        [$alice, $bob] = [User::factory()->create(['name' => 'Alice']), User::factory()->create(['name' => 'Bob'])];

        $this->simulateRequest($alice);
        $this->assertSame('Alice', app('cart.singleton')->ownerName());

        $this->simulateRequest($bob);
        $this->assertSame('Alice', app('cart.singleton')->ownerName());   // BUG: Bob sees Alice's cart
    }

    public function test_scoped_binding_is_rebuilt_for_every_request(): void
    {
        [$alice, $bob] = [User::factory()->create(['name' => 'Alice']), User::factory()->create(['name' => 'Bob'])];

        $this->simulateRequest($alice);
        $this->assertSame('Alice', app(CartService::class)->ownerName());

        $this->simulateRequest($bob);
        $this->assertSame('Bob', app(CartService::class)->ownerName());   // AppServiceProvider uses scoped()
    }
}
