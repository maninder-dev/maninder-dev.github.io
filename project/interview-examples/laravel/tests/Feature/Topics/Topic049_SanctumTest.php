<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Topic 049: Sanctum vs Passport (API Authentication) (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic049
 *
 * laravel/sanctum is installed. Personal access tokens with abilities, auth:sanctum, tokenCan,
 * revoking the current token. (Passport, a full OAuth2 server, is not installed.)
 */
class Topic049_SanctumTest extends TestCase
{
    use RefreshDatabase;

    public function test_token_with_abilities(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('iphone-app', ['orders:read'])->plainTextToken;

        $this->getJson('/api/user')->assertUnauthorized();
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()->assertJson(['id' => $user->id, 'can_read_orders' => true]);

        $this->assertNotSame($token, PersonalAccessToken::first()->token);   // only a SHA-256 hash is stored
    }

    public function test_token_without_the_ability_is_forbidden(): void
    {
        $user = User::factory()->create();
        Order::factory()->for($user)->create();

        Sanctum::actingAs($user, ['profile:read']);
        $this->getJson('/api/v1/orders')->assertForbidden();

        Sanctum::actingAs($user, ['orders:read']);
        $this->getJson('/api/v1/orders')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_revoking_the_current_token(): void
    {
        $token = User::factory()->create()->createToken('cli')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertNoContent();

        $this->assertSame(0, PersonalAccessToken::count());
        $this->app['auth']->forgetGuards();                  // fresh guard, as on a new request
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }
}
