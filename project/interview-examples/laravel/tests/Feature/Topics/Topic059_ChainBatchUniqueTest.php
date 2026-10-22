<?php

namespace Tests\Feature\Topics;

use App\Jobs\PodcastStep;
use App\Jobs\SyncOrderToErp;
use App\Models\Order;
use App\Support\Trace;
use Illuminate\Bus\Batch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;
use Throwable;

/**
 * Topic 059: Job Chaining, Batching and Uniqueness (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic059
 *
 * Chain = in order, stop on failure. Batch = tracked in the job_batches table with progress
 * and then/catch callbacks. ShouldBeUnique = only one queued instance per uniqueId().
 */
class Topic059_ChainBatchUniqueTest extends TestCase
{
    use RefreshDatabase;

    public function test_chain_runs_in_order(): void
    {
        Bus::chain([new PodcastStep('process'), new PodcastStep('optimize'), new PodcastStep('publish')])->dispatch();

        $this->assertSame(['process', 'optimize', 'publish'], $this->trace());
    }

    public function test_chain_stops_at_the_first_failure(): void
    {
        try {
            Bus::chain([new PodcastStep('process'), new PodcastStep('optimize', fail: true), new PodcastStep('publish')])
                ->catch(fn (Throwable $e) => Trace::record('caught: '.$e->getMessage()))
                ->dispatch();
        } catch (RuntimeException) {
        }

        $this->assertSame('process', $this->trace()[0]);
        $this->assertContains('caught: optimize failed', $this->trace());   // (the sync driver may report it twice)
        $this->assertNotContains('optimize', $this->trace());
        $this->assertNotContains('publish', $this->trace());                 // never ran
    }

    public function test_batch_is_tracked_in_the_database(): void
    {
        $batch = Bus::batch([new PodcastStep('ep1'), new PodcastStep('ep2'), new PodcastStep('ep3')])
            ->then(fn (Batch $b) => Trace::record('all done'))
            ->allowFailures()
            ->name('newsletters')
            ->dispatch();

        $fresh = Bus::findBatch($batch->id);
        $this->assertSame(100, $fresh->progress());
        $this->assertTrue($fresh->finished());
        $this->assertSame(3, $fresh->totalJobs);
        $this->assertSame('newsletters', DB::table('job_batches')->value('name'));
        $this->assertSame(['ep1', 'ep2', 'ep3', 'all done'], $this->trace());
    }

    public function test_unique_job_is_only_queued_once_per_order(): void
    {
        Queue::fake();
        [$a, $b] = Order::factory()->count(2)->create();

        SyncOrderToErp::dispatch($a);
        SyncOrderToErp::dispatch($a);          // lock held -> silently dropped
        SyncOrderToErp::dispatch($b);

        Queue::assertPushed(SyncOrderToErp::class, 2);
        Queue::assertPushed(SyncOrderToErp::class, fn ($job) => $job->order->is($b));
    }
}
