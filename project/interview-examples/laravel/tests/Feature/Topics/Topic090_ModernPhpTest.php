<?php

namespace Tests\Feature\Topics;

use App\Enums\OrderStatus;
use App\Models\Post;
use App\Observers\PostObserver;
use App\ValueObjects\Address;
use Error;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use ReflectionClass;
use Tests\TestCase;

/**
 * Topic 090: Modern PHP Features Used in Laravel (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic090
 *
 * Enums, readonly promoted properties, match, nullsafe, named arguments, first-class callables,
 * attributes. Property hooks need PHP 8.4; this app runs 8.3, so that one is shown as the 8.3
 * equivalent (a getter). On 8.4 it would be:
 *     class Temperature { public float $fahrenheit { get => $this->celsius * 9 / 5 + 32; }
 *                         public function __construct(public float $celsius) {} }
 */
class Topic090_ModernPhpTest extends TestCase
{
    public function test_enums_with_methods_and_validation(): void
    {
        $this->assertSame('Paid', OrderStatus::Paid->label());
        $this->assertSame(OrderStatus::Paid, OrderStatus::from('paid'));
        $this->assertNull(OrderStatus::tryFrom('unknown'));
        $this->assertTrue(Validator::make(['s' => 'shipped'], ['s' => [Rule::enum(OrderStatus::class)]])->passes());
        $this->assertTrue(Validator::make(['s' => 'lost'], ['s' => [Rule::enum(OrderStatus::class)]])->fails());
    }

    public function test_match_nullsafe_named_args_first_class_callable(): void
    {
        $fee = fn (OrderStatus $s) => match ($s) { OrderStatus::Pending => 0, OrderStatus::Paid => 49, default => 99 };
        $this->assertSame([0, 49, 99], [$fee(OrderStatus::Pending), $fee(OrderStatus::Paid), $fee(OrderStatus::Shipped)]);

        $user = null;
        $this->assertNull($user?->address?->city);

        $address = new Address(pin: '160001', city: 'Chandigarh');            // named, any order
        $this->assertSame('Chandigarh', $address->city);

        $this->assertSame(['A', 'B'], array_map(strtoupper(...), ['a', 'b']));
    }

    public function test_readonly_and_attributes(): void
    {
        $address = new Address('Delhi', '110001');
        try {
            $address->city = 'Mumbai';
            $this->fail('readonly property was modified');
        } catch (Error $e) {
            $this->assertStringContainsString('readonly', $e->getMessage());
        }

        $attribute = (new ReflectionClass(Post::class))->getAttributes(ObservedBy::class)[0];
        $this->assertSame([PostObserver::class], $attribute->getArguments());
    }

    public function test_property_hooks_need_php_84(): void
    {
        $this->assertSame(8, PHP_MAJOR_VERSION);
        $temperature = new class(100.0)
        {
            public function __construct(public float $celsius) {}

            public function fahrenheit(): float           // 8.3 equivalent of a "get" hook
            {
                return $this->celsius * 9 / 5 + 32;
            }
        };
        $this->assertSame(212.0, $temperature->fahrenheit());
    }
}
