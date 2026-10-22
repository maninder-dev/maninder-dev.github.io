<?php

namespace Tests\Feature\Topics;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\ValueObjects\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Topic 087: Macros, Traits and Custom Casts (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic087
 *
 * Str::initials and Builder::whereContains macros (AppServiceProvider), the HasUuid trait
 * (Invoice) and MoneyCast (Order::total). Laravel 11+ ships a native whereLike, so the
 * handbook's whereLike macro is named whereContains here.
 */
class Topic087_MacrosTraitsCastsTest extends TestCase
{
    use RefreshDatabase;

    public function test_macros(): void
    {
        $this->assertSame('MS', Str::initials('Maninder Singh'));

        Product::factory()->create(['name' => 'Red phone case']);
        Product::factory()->create(['name' => 'Blue mug']);
        $this->assertSame(['Red phone case'], Product::whereContains('name', 'phone')->pluck('name')->all());
    }

    public function test_trait_boot_method_fills_the_uuid(): void
    {
        $invoice = Invoice::create(['user_id' => User::factory()->create()->id, 'number' => 'INV-1', 'amount' => 100]);

        $this->assertTrue(Str::isUuid($invoice->uuid));
    }

    public function test_custom_cast_round_trip(): void
    {
        $order = Order::factory()->create(['total' => new Money(149_900)]);

        $this->assertInstanceOf(Money::class, $order->fresh()->total);
        $this->assertSame('Rs. 1,499.00', $order->fresh()->total->format());
        $this->assertSame(149_900, (int) DB::table('orders')->value('total'));   // stored as paise
    }
}
