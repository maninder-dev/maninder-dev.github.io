<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use stdClass;
use Tests\TestCase;

/**
 * Topic 030: Query Builder vs Eloquent vs Raw SQL (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic030
 *
 * Eloquent returns models (events, casts); the query builder returns plain rows (fast reports);
 * raw SQL must always use bindings.
 */
class Topic030_QueryBuilderVsEloquentTest extends TestCase
{
    use RefreshDatabase;

    public function test_three_styles_return_different_shapes(): void
    {
        $alice = User::factory()->create(['name' => 'alice', 'email' => 'Alice@Example.com']);
        $bob = User::factory()->create(['name' => 'bob']);
        $alice->orders()->createMany([['total' => 500, 'status' => 'paid'], ['total' => 300, 'status' => 'paid']]);
        $bob->orders()->create(['total' => 900, 'status' => 'pending']);

        $this->assertInstanceOf(User::class, User::where('active', true)->first());

        $rows = DB::table('orders')
            ->join('users', 'users.id', '=', 'orders.user_id')
            ->select('users.name', DB::raw('SUM(orders.total) as revenue'))
            ->where('orders.status', 'paid')
            ->groupBy('users.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();
        $this->assertInstanceOf(stdClass::class, $rows->first());
        $this->assertEquals([['name' => 'alice', 'revenue' => 800]], $rows->map(fn ($r) => (array) $r)->all());

        $raw = DB::select('SELECT name FROM users WHERE email = ?', ['alice@example.com']);   // mutator lower-cased it
        $this->assertSame('alice', $raw[0]->name);
        $this->assertSame('bob', DB::table('users')->whereRaw('LOWER(name) = ?', ['bob'])->value('name'));
    }
}
