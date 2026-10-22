<?php

namespace Tests\Feature\Topics;

use Illuminate\Support\LazyCollection;
use Tests\TestCase;

/**
 * Topic 011: Helpers and Collections (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic011
 *
 * Chainable array helpers; LazyCollection streams huge data with generators.
 */
class Topic011_CollectionsTest extends TestCase
{
    private function orders()
    {
        return collect([
            ['user' => 'alice', 'total' => 500, 'status' => 'paid'],
            ['user' => 'bob', 'total' => 200, 'status' => 'pending'],
            ['user' => 'alice', 'total' => 300, 'status' => 'paid'],
        ]);
    }

    public function test_group_and_sum(): void
    {
        $revenue = $this->orders()->where('status', 'paid')->groupBy('user')->map(fn ($rows) => $rows->sum('total'));

        $this->assertSame(['alice' => 800], $revenue->all());
        $this->assertEqualsWithDelta(333.33, $this->orders()->pluck('total')->avg(), 0.01);
        $this->assertSame(500, $this->orders()->sortByDesc('total')->first()['total']);
    }

    public function test_chunk_keyby_partition(): void
    {
        $orders = $this->orders();

        $this->assertSame([2, 1], $orders->chunk(2)->map->count()->all());
        $this->assertSame(['alice', 'bob'], $orders->keyBy('user')->keys()->all());  // last alice wins
        [$big, $small] = $orders->partition(fn ($o) => $o['total'] > 250);
        $this->assertCount(2, $big);
        $this->assertCount(1, $small);
    }

    public function test_lazy_collection_only_pulls_what_it_needs(): void
    {
        $generated = 0;
        $lines = LazyCollection::make(function () use (&$generated) {
            for ($i = 0; $i < 1_000_000; $i++) {
                $generated++;
                yield "row {$i}";
            }
        });

        $first = $lines->skip(1)->take(3)->all();

        $this->assertSame(['row 1', 'row 2', 'row 3'], array_values($first));
        $this->assertLessThan(10, $generated);     // never built the million rows
    }

    public function test_handy_helpers(): void
    {
        $this->assertSame('b', data_get(['a' => ['x' => 'b']], 'a.x'));
        $this->assertSame('laravel-tips', str('Laravel Tips')->slug()->toString());
        $this->assertSame(3, retry(3, function (int $attempt) {
            if ($attempt < 3) {
                throw new \RuntimeException('flaky');
            }

            return $attempt;
        }));
    }
}
