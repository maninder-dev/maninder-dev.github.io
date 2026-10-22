<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 052: Roles and Permissions (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic052
 *
 * SIMULATED: spatie/laravel-permission is not installed. A minimal version of the same idea
 * lives in this app: roles + permissions tables, User::assignRole/hasRole/hasPermission, and a
 * Gate::before hook so $user->can('publish posts') and the can: middleware work.
 */
class Topic052_RolesPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_and_permissions_plug_into_gates(): void
    {
        $editor = User::factory()->create();
        $editor->assignRole('editor');
        Role::firstWhere('name', 'editor')->givePermissionTo('publish posts');
        $reader = User::factory()->create();

        $this->assertTrue($editor->hasRole('editor'));
        $this->assertTrue($editor->can('publish posts'));
        $this->assertFalse($reader->can('publish posts'));
        $this->assertNotNull($editor->roles->first()->pivot->assigned_at);
    }

    public function test_permission_middleware_and_role_middleware(): void
    {
        $post = Post::factory()->create();
        $editor = User::factory()->create();
        $editor->assignRole('editor');
        Role::firstWhere('name', 'editor')->givePermissionTo('publish posts');

        $this->actingAs(User::factory()->create())->post("/posts/{$post->id}/publish")->assertForbidden();
        $this->actingAs($editor)->post("/posts/{$post->id}/publish")->assertOk();

        $analyst = User::factory()->create();
        $analyst->forceFill(['role' => 'analyst'])->save();
        $this->actingAs($analyst)->get('/analyst-area')->assertOk();                 // role:admin,analyst
        $this->actingAs(User::factory()->create())->get('/analyst-area')->assertForbidden();
    }
}
