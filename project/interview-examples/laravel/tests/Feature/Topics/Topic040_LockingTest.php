<?php

namespace Tests\Feature\Topics;

use App\Exceptions\InsufficientStock;
use App\Models\Product;
use App\Models\Seat;
use App\Models\User;
use Illuminate\Database\Query\Grammars\MySqlGrammar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Topic 040: Locking and Race Conditions (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic040
 *
 * SQLite has no row locks, so lockForUpdate() compiles to nothing here; we show the MySQL SQL it
 * generates. The atomic conditional update (seat booking) works on every database: the number of
 * affected rows tells you who won. Cache::lock serialises work across servers.
 */
class Topic040_LockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_lock_for_update_generates_select_for_update_on_mysql(): void
    {
        $query = Product::query()->lockForUpdate()->whereKey(1)->getQuery();
        $query->grammar = new MySqlGrammar(DB::connection());

        $this->assertSame('select * from `products` where `products`.`id` = ? for update', $query->toSql());

        $query = Product::query()->sharedLock()->getQuery();
        $query->grammar = new MySqlGrammar(DB::connection());
        $this->assertStringEndsWith('lock in share mode', $query->toSql());
    }

    public function test_pessimistic_lock_pattern_refuses_overselling(): void
    {
        $product = Product::factory()->create(['stock' => 1]);
        $buy = fn () => DB::transaction(function () use ($product) {
            $locked = Product::lockForUpdate()->findOrFail($product->id);
            if ($locked->stock < 1) {
                throw new InsufficientStock($locked->name);
            }
            $locked->decrement('stock');
        });

        $buy();
        $this->expectException(InsufficientStock::class);
        $buy();
    }

    public function test_atomic_conditional_update_has_exactly_one_winner(): void
    {
        $seat = Seat::create(['label' => 'A1']);
        [$alice, $bob] = User::factory()->count(2)->create();

        $aliceWon = Seat::whereKey($seat->id)->whereNull('booked_by')->update(['booked_by' => $alice->id]);
        $bobWon = Seat::whereKey($seat->id)->whereNull('booked_by')->update(['booked_by' => $bob->id]);

        $this->assertSame(1, $aliceWon);
        $this->assertSame(0, $bobWon);                 // -> abort(409, 'That seat was just booked...')
        $this->assertSame($alice->id, $seat->fresh()->booked_by);
    }

    public function test_cache_lock_lets_only_one_holder_in(): void
    {
        $first = Cache::lock('checkout:7', 10);
        $second = Cache::lock('checkout:7', 10);

        $this->assertTrue($first->get());
        $this->assertFalse($second->get());            // someone else is checking out
        $first->release();
        $this->assertSame('done', $second->block(1, fn () => 'done'));
    }
}
