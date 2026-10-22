<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\LazyCollection;
use Tests\TestCase;

/**
 * Topic 038: Processing Large Datasets: chunk, lazy, cursor (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic038
 *
 * The classic bug: chunk() pages with OFFSET, so updating the column you filter on shifts the
 * pages and skips rows. chunkById() pages with WHERE id > last and processes all of them.
 */
class Topic038_LargeDatasetsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        User::factory()->count(10)->create(['notified' => false]);
    }

    public function test_chunk_skips_rows_when_you_modify_the_filter_column(): void
    {
        User::where('notified', false)->chunk(2, fn ($users) => $users->each->update(['notified' => true]));

        $this->assertGreaterThan(0, User::where('notified', false)->count());   // BUG: some rows never processed
        $this->assertSame(4, User::where('notified', false)->count());
    }

    public function test_chunk_by_id_processes_every_row(): void
    {
        User::where('notified', false)->chunkById(2, fn ($users) => $users->each->update(['notified' => true]));

        $this->assertSame(0, User::where('notified', false)->count());
    }

    public function test_lazy_cursor_and_bulk_update(): void
    {
        $lazy = User::where('active', true)->lazyById(3);
        $this->assertInstanceOf(LazyCollection::class, $lazy);
        $this->assertSame(10, $lazy->count());

        $queries = $this->queriesDuring(fn () => iterator_to_array(User::cursor()));
        $this->assertCount(1, $queries);                                     // ONE query, one model at a time

        $updated = User::where('notified', false)->update(['notified' => true]);   // no models loaded at all
        $this->assertSame(10, $updated);
    }
}
