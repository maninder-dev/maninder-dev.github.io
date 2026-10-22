<?php

namespace Tests\Feature\Topics;

use App\Models\ActivityLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * Topic 010: Artisan CLI (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic010
 *
 * A custom command (app/Console/Commands/PruneOldLogs.php) with an option, tested through artisan().
 */
class Topic010_ArtisanTest extends TestCase
{
    use RefreshDatabase;

    public function test_logs_prune_deletes_entries_older_than_the_cutoff(): void
    {
        ActivityLog::create(['message' => 'old', 'created_at' => now()->subDays(40)]);
        ActivityLog::create(['message' => 'older', 'created_at' => now()->subDays(90)]);
        ActivityLog::create(['message' => 'recent', 'created_at' => now()->subDays(2)]);

        $this->artisan('logs:prune', ['--days' => 30])
            ->expectsOutput('Deleted 2 log entries.')
            ->assertSuccessful();

        $this->assertSame(['recent'], ActivityLog::pluck('message')->all());
    }

    public function test_built_in_commands_are_registered(): void
    {
        foreach (['make:model', 'migrate', 'route:list', 'tinker', 'queue:work', 'optimize', 'logs:prune'] as $name) {
            $this->assertArrayHasKey($name, Artisan::all(), $name);
        }
    }
}
