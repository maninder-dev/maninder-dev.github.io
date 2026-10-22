<?php

namespace Tests\Feature\Topics;

use App\Contracts\PaymentGateway;
use App\Enums\OrderStatus;
use App\Exceptions\CardDeclined;
use App\Exceptions\InsufficientStock;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\CheckoutService;
use App\Services\Payments\StripeGateway;
use App\Support\Cart;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Topic 082: Fat Models, Thin Controllers, and Service Classes (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic082
 *
 * CheckoutService holds the business logic (inventory + order + charge + event, in one
 * transaction) and is used here with no HTTP at all. CheckoutController only validates,
 * calls it and responds.
 */
class Topic082_ServiceClassesTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_works_without_http(): void
    {
        Mail::fake();
        $this->app->instance(PaymentGateway::class, new StripeGateway);
        $product = Product::factory()->create(['price' => 500, 'stock' => 5]);

        $order = app(CheckoutService::class)->checkout(User::factory()->create(), Cart::fromLines([['product_id' => $product->id, 'qty' => 2]]));

        $this->assertSame(OrderStatus::Paid, $order->status);
        $this->assertSame(1000, $order->fresh()->total->paise);
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_a_declined_card_rolls_back_stock_and_order(): void
    {
        $this->mock(PaymentGateway::class)->shouldReceive('charge')->andThrow(new CardDeclined('declined'));
        $product = Product::factory()->create(['stock' => 5]);

        try {
            app(CheckoutService::class)->checkout(User::factory()->create(), Cart::fromLines([['product_id' => $product->id, 'qty' => 2]]));
            $this->fail('Expected CardDeclined');
        } catch (CardDeclined) {
        }

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_insufficient_stock_is_refused_before_charging(): void
    {
        $this->mock(PaymentGateway::class)->shouldNotReceive('charge');
        $product = Product::factory()->create(['stock' => 1]);

        $this->expectException(InsufficientStock::class);
        app(CheckoutService::class)->checkout(User::factory()->create(), Cart::fromLines([['product_id' => $product->id, 'qty' => 2]]));
    }

    public function test_the_controller_is_thin(): void
    {
        $method = new \ReflectionMethod(\App\Http\Controllers\CheckoutController::class, '__invoke');

        $this->assertLessThan(25, $method->getEndLine() - $method->getStartLine());
    }
}
