<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Topic 057: Email Verification and Password Reset (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic057
 */
class Topic057_EmailVerificationPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_middleware_blocks_unverified_users(): void
    {
        $this->assertInstanceOf(MustVerifyEmail::class, new User);

        $this->actingAs(User::factory()->unverified()->create())->get('/billing')->assertRedirect('/email/verify');
        $this->actingAs(User::factory()->create())->get('/billing')->assertOk();
    }

    public function test_verification_email_is_a_notification(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $user->sendEmailVerificationNotification();

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_password_reset_link_and_reset(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $status = Password::sendResetLink(['email' => $user->email]);
        $this->assertSame(Password::RESET_LINK_SENT, $status);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token) {
            $token = $n->token;

            return true;
        });

        $status = Password::reset(
            ['email' => $user->email, 'token' => $token, 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1'],
            fn (User $u, string $password) => $u->forceFill(['password' => $password])->save(),
        );
        $this->assertSame(Password::PASSWORD_RESET, $status);
        $this->assertTrue(auth()->attempt(['email' => $user->email, 'password' => 'new-password-1']));
    }
}
