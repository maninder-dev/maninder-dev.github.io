<?php

namespace Tests\Feature\Topics;

use App\Jobs\SendReceipt;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use RuntimeException;
use Tests\TestCase;

/**
 * Topic 039: Database Transactions (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic039
 *
 * The closure form commits on success and rolls back on any exception; afterCommit work only
 * runs if the transaction actually commits.
 */
class Topic039_TransactionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_exception_rolls_everything_back(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create(['stock' => 5]);

        try {
            DB::transaction(function () use ($user, $product) {
                $order = $user->orders()->create(['total' => 1000]);
                $order->items()->create(['product_id' => $product->id, 'price' => 1000, 'qty' => 1]);
                Product::whereKey($product->id)->decrement('stock', 1);
                throw new RuntimeException('payment failed');
            }, attempts: 3);
        } catch (RuntimeException) {
        }

        $this->assertSame(0, Order::count());
        $this->assertSame(5, $product->fresh()->stock);
    }

    public function test_manual_form_and_commit(): void
    {
        $user = User::factory()->create();

        DB::beginTransaction();
        try {
            $user->orders()->create(['total' => 500]);
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $this->assertSame(1, Order::count());
    }

    public function test_after_commit_only_runs_when_committed(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        try {
            DB::transaction(function () use ($user) {
                $order = $user->orders()->create(['total' => 1]);
                DB::afterCommit(fn () => SendReceipt::dispatch($order));
                throw new RuntimeException('rollback');
            });
        } catch (RuntimeException) {
        }
        Queue::assertNothingPushed();

        DB::transaction(function () use ($user) {
            $order = $user->orders()->create(['total' => 2]);
            DB::afterCommit(fn () => SendReceipt::dispatch($order));
        });
        Queue::assertPushed(SendReceipt::class, 1);
    }
}
