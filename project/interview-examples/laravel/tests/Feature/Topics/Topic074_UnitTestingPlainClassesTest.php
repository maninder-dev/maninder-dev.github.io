<?php

namespace Tests\Feature\Topics;

use App\Services\DiscountCalculator;
use App\ValueObjects\Money;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Topic 074: Unit Testing Plain Classes (Laravel Handbook, Part 7)
 * Run: php artisan test --filter=Topic074
 *
 * Extends PHPUnit's own TestCase: no framework boot, no database, milliseconds per test.
 * A data provider plays the role of Pest's ->with([...]).
 */
class Topic074_UnitTestingPlainClassesTest extends TestCase
{
    public static function totals(): array
    {
        return [
            'below the threshold' => [500, 500],
            'exactly the threshold' => [1000, 1000],
            'above the threshold' => [1500, 1350],
        ];
    }

    #[DataProvider('totals')]
    public function test_applies_a_10_percent_discount_above_1000(int $total, int $expected): void
    {
        $this->assertSame($expected, (new DiscountCalculator)->apply($total));
    }

    public function test_value_object_without_the_framework(): void
    {
        $this->assertSame('Rs. 1,499.00', Money::of(149_900)->format());
    }
}
