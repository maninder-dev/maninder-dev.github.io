<?php

namespace Tests\Feature\Topics;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Pipeline;
use Tests\TestCase;

/**
 * Topic 086: The Pipeline Pattern (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic086
 *
 * GET /products passes a query through ByCategory -> ByPriceRange -> Sort (app/Pipelines/Filters).
 * Middleware works the same way.
 */
class Topic086_PipelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_filters_compose(): void
    {
        $phones = Category::create(['name' => 'Phones']);
        $books = Category::create(['name' => 'Books']);
        Product::factory()->create(['name' => 'cheap phone', 'price' => 5_000, 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'mid phone', 'price' => 20_000, 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'top phone', 'price' => 90_000, 'category_id' => $phones->id]);
        Product::factory()->create(['name' => 'novel', 'price' => 20_000, 'category_id' => $books->id]);

        $names = fn (string $query) => collect($this->getJson("/products?{$query}")->json('data'))->pluck('name')->all();

        $this->assertCount(4, $names(''));
        $this->assertSame(['cheap phone', 'mid phone', 'top phone'], $names("category={$phones->id}&sort=price"));
        $this->assertSame(['top phone', 'mid phone'], $names("category={$phones->id}&min=10000&sort=price&dir=desc"));
        $this->assertCount(4, $names('sort=password'));                     // unknown sort column ignored
    }

    public function test_pipeline_with_closures(): void
    {
        $result = Pipeline::send('  Hello World  ')
            ->through([
                fn (string $s, \Closure $next) => $next(trim($s)),
                fn (string $s, \Closure $next) => $next(strtolower($s)),
                fn (string $s, \Closure $next) => $next(str_replace(' ', '-', $s)),
            ])
            ->thenReturn();

        $this->assertSame('hello-world', $result);
    }
}
