<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 026: Mass Assignment (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic026
 *
 * $fillable is an allow list: an attacker adding is_admin=1 to the form is ignored, or throws
 * in development with preventSilentlyDiscardingAttributes (part of shouldBeStrict()).
 */
class Topic026_MassAssignmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_attributes_throw_in_development(): void
    {
        $this->assertTrue(Model::preventsSilentlyDiscardingAttributes());

        $this->expectException(MassAssignmentException::class);
        User::create(['name' => 'Eve', 'email' => 'eve@example.com', 'password' => 'secret123', 'is_admin' => true]);
    }

    public function test_in_production_mode_is_admin_is_silently_ignored(): void
    {
        Model::preventSilentlyDiscardingAttributes(false);
        try {
            $user = User::create(['name' => 'Eve', 'email' => 'eve@example.com', 'password' => 'secret123', 'is_admin' => true]);

            $this->assertFalse($user->fresh()->is_admin);
        } finally {
            Model::preventSilentlyDiscardingAttributes(true);
        }
    }

    public function test_the_safe_pattern_is_only_validated_data(): void
    {
        $this->actingAs($user = User::factory()->create())
            ->post('/profile', ['name' => 'New', 'email' => 'new@example.com', 'is_admin' => 1])
            ->assertRedirect();

        $user->refresh();
        $this->assertSame('New', $user->name);
        $this->assertFalse($user->is_admin);      // validated() never contained is_admin
    }
}
