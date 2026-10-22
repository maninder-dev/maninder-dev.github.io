<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Topic 055: Rate Limiting (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic055
 *
 * Named limiters (RateLimiter::for in AppServiceProvider) used with throttle:login, and the
 * manual RateLimiter API for any action (OTP sending).
 */
class Topic055_RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_throttled_after_five_attempts(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 5) as $i) {
            $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])->assertRedirect();
        }

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertStatus(429)
            ->assertSee('Too many login attempts. Try again in a minute.');

        // keyed by email + IP: another account from the same IP is not blocked
        $this->post('/login', ['email' => 'other@example.com', 'password' => 'x'])->assertRedirect();
    }

    public function test_limit_resets_after_the_window(): void
    {
        foreach (range(1, 6) as $i) {
            $last = $this->post('/login', ['email' => 'a@b.com', 'password' => 'x']);
        }
        $last->assertStatus(429);

        $this->travel(61)->seconds();
        $this->post('/login', ['email' => 'a@b.com', 'password' => 'x'])->assertRedirect();
    }

    public function test_manual_limiter(): void
    {
        foreach ([2, 1, 0] as $remaining) {
            $this->postJson('/otp', ['phone' => '9876543210'])->assertOk()->assertJson(['remaining' => $remaining]);
        }
        $this->postJson('/otp', ['phone' => '9876543210'])->assertStatus(429);
        $this->assertTrue(RateLimiter::tooManyAttempts('otp:9876543210', 3));
    }
}
