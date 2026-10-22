<?php

namespace Tests\Feature\Topics;

use App\Models\Project;
use App\Models\Tenant;
use App\Support\CurrentTenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 088: Multi-Tenancy Approaches (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic088
 *
 * Single database + tenant_id: the BelongsToTenant trait adds a global scope and stamps new
 * rows. The current tenant is a scoped() binding, so it resets between requests/jobs.
 * (Per-database tenancy is what stancl/tenancy or spatie/laravel-multitenancy add.)
 */
class Topic088_MultiTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_queries_are_isolated_and_new_rows_are_stamped(): void
    {
        $acme = Tenant::create(['name' => 'Acme', 'subdomain' => 'acme']);
        $globex = Tenant::create(['name' => 'Globex', 'subdomain' => 'globex']);

        app(CurrentTenant::class)->set($acme);
        $secret = Project::create(['name' => 'Acme roadmap']);
        $this->assertSame($acme->id, $secret->tenant_id);                    // stamped automatically

        app(CurrentTenant::class)->set($globex);
        Project::create(['name' => 'Globex launch']);

        $this->assertSame(['Globex launch'], Project::pluck('name')->all());
        $this->assertNull(Project::find($secret->id));                       // no leak by id either
        $this->assertSame(2, Project::withoutGlobalScope('tenant')->count());
    }

    public function test_current_tenant_resets_per_request(): void
    {
        app(CurrentTenant::class)->set(Tenant::create(['name' => 'Acme', 'subdomain' => 'acme']));
        $this->assertSame('Acme', tenant()->name);

        $this->app->forgetScopedInstances();                                  // next request / job

        $this->assertNull(tenant());
    }
}
