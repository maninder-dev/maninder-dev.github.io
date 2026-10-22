<?php

namespace Tests\Feature\Topics;

use App\Data\CreateOrderData;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Product;
use App\Models\User;
use App\ValueObjects\Money;
use Error;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Topic 085: DTOs and Value Objects (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic085
 */
class Topic085_DtosValueObjectsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dto_is_built_from_a_validated_request(): void
    {
        $user = User::factory()->create();
        $product = Product::factory()->create();
        $request = StoreOrderRequest::create('/api/v1/orders', 'POST', [
            'items' => [['product_id' => $product->id, 'qty' => 2]], 'coupon' => 'DIWALI', 'is_admin' => true,
        ]);
        $request->setContainer($this->app)->setRedirector($this->app['redirect']);
        $request->setUserResolver(fn () => $user);
        $request->validateResolved();

        $data = CreateOrderData::fromRequest($request);

        $this->assertSame($user->id, $data->userId);
        $this->assertSame([['product_id' => $product->id, 'qty' => 2]], $data->items);
        $this->assertSame('DIWALI', $data->couponCode);

        $this->expectException(Error::class);                   // readonly: cannot be modified
        $data->userId = 99;
    }

    public function test_money_value_object(): void
    {
        $total = Money::of(100_000)->add(Money::of(49_900));

        $this->assertSame('Rs. 1,499.00', $total->format());
        $this->assertTrue($total->equals(new Money(149_900)));

        $this->expectException(InvalidArgumentException::class);
        new Money(-1);
    }
}
