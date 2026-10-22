<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\Project;
use App\Models\Tenant;
use App\Support\CurrentTenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 031: Local and Global Scopes (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic031
 *
 * Local scopes are reusable query pieces you opt into; a global scope (the tenant scope on
 * Project, from the BelongsToTenant trait) applies to every query until you opt out.
 */
class Topic031_ScopesTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_scopes_chain(): void
    {
        Post::factory()->published()->create(['title' => 'hit', 'views' => 5000]);
        Post::factory()->published()->create(['title' => 'quiet', 'views' => 10]);
        Post::factory()->create(['title' => 'draft', 'views' => 9000]);
        Post::factory()->published()->create(['title' => 'scheduled', 'published_at' => now()->addDay()]);

        $this->assertEqualsCanonicalizing(['hit', 'quiet'], Post::published()->pluck('title')->all());
        $this->assertSame(['hit'], Post::published()->popular()->pluck('title')->all());
        $this->assertSame(['hit', 'quiet'], Post::published()->popular(10)->orderBy('id')->pluck('title')->all());
    }

    public function test_global_scope_and_opting_out(): void
    {
        $acme = Tenant::create(['name' => 'Acme', 'subdomain' => 'acme']);
        $globex = Tenant::create(['name' => 'Globex', 'subdomain' => 'globex']);
        Project::create(['name' => 'A1', 'tenant_id' => $acme->id]);
        Project::create(['name' => 'G1', 'tenant_id' => $globex->id]);

        app(CurrentTenant::class)->set($acme);

        $this->assertSame(['A1'], Project::pluck('name')->all());
        $this->assertStringContainsString('"projects"."tenant_id" = ?', Project::query()->toSql());
        $this->assertSame(2, Project::withoutGlobalScope('tenant')->count());   // admin report
    }
}
