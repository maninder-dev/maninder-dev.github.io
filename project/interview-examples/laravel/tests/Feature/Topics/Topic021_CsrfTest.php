<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\StrictCsrf;
use Tests\TestCase;

/**
 * Topic 021: CSRF Protection (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic021
 *
 * Laravel disables CSRF checks during tests, so we swap in StrictCsrf (same middleware with
 * the test bypass removed). No token -> 419; session token -> OK; webhooks/* is excluded.
 */
class Topic021_CsrfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->bind(PreventRequestForgery::class, StrictCsrf::class);
    }

    public function test_post_without_a_token_is_rejected_with_419(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/profile', ['name' => 'Ann', 'email' => 'ann@example.com'])
            ->assertStatus(419);
    }

    public function test_post_with_the_session_token_passes(): void
    {
        $this->actingAs(User::factory()->create())
            ->withSession(['_token' => 'known-token'])
            ->post('/profile', ['_token' => 'known-token', 'name' => 'Ann', 'email' => 'ann@example.com'])
            ->assertRedirect();

        $this->assertDatabaseHas('users', ['email' => 'ann@example.com']);
    }

    public function test_excluded_webhook_needs_no_token(): void
    {
        $body = json_encode(['event' => 'payment.captured']);
        $this->call('POST', '/webhooks/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => hash_hmac('sha256', $body, 'whsec_test'),
        ], $body)->assertNoContent();
    }
}
