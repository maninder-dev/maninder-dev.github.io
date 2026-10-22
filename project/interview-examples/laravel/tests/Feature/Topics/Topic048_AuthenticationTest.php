<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 048: Authentication Basics and Starter Kits (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic048
 *
 * Hand-written session login (what Breeze/starter kits scaffold): Auth::attempt, session
 * regeneration (no fixation), redirect()->intended(), logout invalidation, the auth middleware.
 */
class Topic048_AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_sent_to_login_and_then_to_the_intended_page(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $this->get('/dashboard')->assertRedirect('/login');                    // remembers url.intended

        $this->post('/login', ['email' => $user->email, 'password' => 'secret-pass'])
            ->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_regenerates_the_session_id(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);
        $this->startSession();
        $before = session()->getId();

        $this->post('/login', ['email' => $user->email, 'password' => 'secret-pass']);

        $this->assertNotSame($before, session()->getId());
    }

    public function test_bad_credentials_and_logout(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $this->from('/login')->post('/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertRedirect('/login')
            ->assertSessionHasErrors(['email' => 'These credentials do not match our records.']);
        $this->assertGuest();

        $this->actingAs($user)->post('/logout')->assertRedirect('/');
        $this->assertGuest();
    }
}
