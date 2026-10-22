<?php

namespace Tests\Feature\Topics;

use App\Jobs\SendReceipt;
use App\Jobs\SyncToCrm;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

/**
 * Topic 097: Queues, Events and Cache Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic097
 *
 * Uses the real database queue + an in-process worker where serialization matters.
 */
class Topic097_QueuesEventsCacheQuestionsTest extends TestCase
{
    use RefreshDatabase;

    private function work(): void
    {
        Artisan::call('queue:work', ['connection' => 'database', '--stop-when-empty' => true, '--sleep' => 0]);
    }

    public function test_models_are_serialized_by_id_and_refetched(): void
    {
        config(['queue.default' => 'database']);
        $order = Order::factory()->hasItems(2)->create(['status' => 'pending']);

        SendReceipt::dispatch($order);
        $payload = DB::table('jobs')->value('payload');
        $this->assertStringContainsString('ModelIdentifier', $payload);          // only class + id stored

        Order::whereKey($order->id)->update(['status' => 'paid']);               // changes after dispatch
        $this->work();

        $this->assertSame(["receipt:{$order->id}:status=paid:items=2"], $this->trace());   // fresh copy
    }

    public function test_delete_when_missing_models(): void
    {
        config(['queue.default' => 'database']);
        $order = Order::factory()->create();
        SendReceipt::dispatch($order);
        $order->forceDelete();

        $this->work();

        $this->assertSame([], $this->trace());
        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(0, DB::table('failed_jobs')->count());              // silently dropped
    }

    public function test_after_commit_dispatch(): void
    {
        // sync connection: an afterCommit job runs when the transaction commits, never on rollback
        try {
            DB::transaction(function () {
                SendReceipt::dispatch(Order::factory()->create())->afterCommit();
                $this->assertSame([], $this->trace());                        // not yet, still inside
                throw new RuntimeException('rollback');
            });
        } catch (RuntimeException) {
        }
        $this->assertSame([], $this->trace());

        $order = DB::transaction(function () {
            $order = Order::factory()->create();
            SendReceipt::dispatch($order)->afterCommit();

            return $order;
        });
        $this->assertSame(["receipt:{$order->id}:status=pending:items=0"], $this->trace());
    }

    public function test_retries_then_failed_jobs(): void
    {
        config(['queue.default' => 'database']);
        SyncToCrm::dispatch();

        $this->work();

        $this->assertSame(['crm-attempt', 'crm-attempt', 'crm-attempt', 'crm-failed:CRM is down'], $this->trace());
        $this->assertSame(1, DB::table('failed_jobs')->count());
    }

    public function test_cache_invalidation_on_write(): void
    {
        $product = Product::factory()->create(['price' => 100]);
        Cache::remember("product:{$product->id}", 3600, fn () => $product->fresh());
        Cache::tags(['catalog'])->put('page:1', ['cached listing'], 3600);

        $product->update(['price' => 200]);                                      // ProductObserver::saved

        $this->assertFalse(Cache::has("product:{$product->id}"));
        $this->assertNull(Cache::tags(['catalog'])->get('page:1'));
        $this->assertSame(200, Cache::rememberForever("product:{$product->id}", fn () => $product->fresh())->price);
    }
}
