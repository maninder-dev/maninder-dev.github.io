<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Topic 099: Performance and Deployment Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic099
 *
 * N+1 detection, chunk vs chunkById (full demo: Topic 38), Octane (Topic 77), deploy commands,
 * and the batched backfill command for a huge table (orders:backfill-currency).
 */
class Topic099_PerformanceDeploymentQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_prevent_lazy_loading_then_fix_with_eager_loading(): void
    {
        Post::factory()->count(3)->create();

        try {
            foreach (Post::all() as $post) {
                $post->author->name;
            }
            $this->fail('lazy loading should throw');
        } catch (LazyLoadingViolationException $e) {
            $this->assertStringContainsString('Attempted to lazy load [author] on model [App\Models\Post]', $e->getMessage());
        }

        $this->assertCount(3, Post::with('author')->get()->map(fn ($p) => $p->author->name));
    }

    public function test_chunk_by_id_is_safe_while_updating(): void
    {
        User::factory()->count(7)->create();
        User::where('notified', false)->chunkById(2, fn ($users) => $users->each->update(['notified' => true]));

        $this->assertSame(0, User::where('notified', false)->count());
    }

    public function test_deploy_script_has_the_essential_commands(): void
    {
        $script = File::get(base_path('scripts/deploy.sh'));

        foreach (['composer install --no-dev --optimize-autoloader', 'php artisan migrate --force', 'php artisan optimize', 'php artisan queue:restart'] as $command) {
            $this->assertStringContainsString($command, $script);
        }
    }

    public function test_backfill_runs_in_small_batches(): void
    {
        Order::factory()->count(7)->create();
        DB::table('orders')->update(['currency' => null]);

        $this->artisan('orders:backfill-currency', ['--batch' => 3, '--sleep' => 0])
            ->expectsOutput('Backfilled in 3 batches.')
            ->assertSuccessful();

        $this->assertSame(0, Order::whereNull('currency')->count());
    }
}
