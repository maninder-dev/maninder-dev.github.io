<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

/**
 * Topic 050: Authorization: Gates (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic050
 *
 * Gate::define('view-reports'), Gate::before for super admins, Gate::authorize throwing 403,
 * the can: route middleware and @can in Blade.
 */
class Topic050_GatesTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role, bool $super = false): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role, 'is_super_admin' => $super])->save();

        return $user;
    }

    public function test_define_allows_and_denies(): void
    {
        $this->assertTrue(Gate::forUser($this->userWithRole('analyst'))->allows('view-reports'));
        $this->assertTrue(Gate::forUser($this->userWithRole('member'))->denies('view-reports'));
    }

    public function test_before_lets_a_super_admin_through_everything(): void
    {
        $this->assertTrue(Gate::forUser($this->userWithRole('member', super: true))->allows('view-reports'));
    }

    public function test_authorize_throws_and_middleware_returns_403(): void
    {
        $member = $this->userWithRole('member');
        $this->actingAs($member)->get('/admin/reports')->assertForbidden();
        $this->actingAs($this->userWithRole('admin'))->get('/admin/reports')->assertOk();

        $this->actingAs($member);
        $this->expectException(AuthorizationException::class);
        Gate::authorize('view-reports');
    }

    public function test_can_directive(): void
    {
        $this->actingAs($this->userWithRole('admin'));
        $this->blade('@can("view-reports") <a href="/reports">Reports</a> @endcan')->assertSee('Reports');
    }
}
