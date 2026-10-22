<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\CursorPaginator;
use Tests\TestCase;

/**
 * Topic 037: Pagination (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic037
 *
 * paginate = page numbers + a COUNT query; simplePaginate = next/prev, no COUNT;
 * cursorPaginate = keyset (WHERE id > ?), no OFFSET, fastest on big tables.
 */
class Topic037_PaginationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Post::factory()->count(35)->create();
    }

    public function test_paginate_runs_a_count_query(): void
    {
        $queries = $this->queriesDuring(fn () => $page = Post::latest('id')->paginate(15, page: 2));
        $this->assertCount(2, $queries);
        $this->assertStringContainsString('count(*)', $queries[0]);
        $this->assertStringContainsString('offset 15', $queries[1]);

        $page = Post::latest('id')->paginate(15, page: 3);
        $this->assertSame(35, $page->total());
        $this->assertSame(3, $page->lastPage());
        $this->assertCount(5, $page->items());
    }

    public function test_simple_paginate_skips_the_count(): void
    {
        $queries = $this->queriesDuring(fn () => Post::latest('id')->simplePaginate(15));
        $this->assertCount(1, $queries);
        $this->assertStringContainsString('limit 16', $queries[0]);         // one extra row = "has more?"
    }

    public function test_cursor_paginate_uses_a_where_not_an_offset(): void
    {
        $first = Post::orderBy('id')->cursorPaginate(15);
        $this->assertInstanceOf(CursorPaginator::class, $first);

        $queries = $this->queriesDuring(fn () => Post::orderBy('id')->cursorPaginate(15, cursor: $first->nextCursor()));
        $this->assertStringContainsString('"id" > ?', $queries[0]);
        $this->assertStringNotContainsString('offset', $queries[0]);
    }
}
