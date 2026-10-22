<?php

namespace Tests\Feature\Topics;

use App\Enums\OrderStatus;
use PHPUnit\Framework\TestCase;
use ValueError;

/**
 * Topic 100: PHP Language Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic100
 *
 * Plain unit tests (no framework): abstract vs interface vs trait, self vs static,
 * == vs ===, closures and arrow functions, enums, PSR-4 autoloading.
 */
interface Payable
{
    public function pay(int $amount): string;
}

abstract class Gateway implements Payable
{
    public array $log = [];

    protected function log(string $msg): void
    {
        $this->log[] = static::class.": {$msg}";
    }
}

trait HasRefunds
{
    public function refund(string $id): string
    {
        return "refunded {$id}";
    }
}

final class DemoGateway extends Gateway
{
    use HasRefunds;

    public function pay(int $amount): string
    {
        $this->log("charging {$amount}");

        return 'pay_1';
    }
}

class BaseModel
{
    public static function make(): static
    {
        return new static;
    }

    public static function makeSelf(): self
    {
        return new self;
    }
}

class DemoPost extends BaseModel {}

class Topic100_PhpLanguageQuestionsTest extends TestCase
{
    public function test_abstract_interface_trait(): void
    {
        $gateway = new DemoGateway;

        $this->assertSame('pay_1', $gateway->pay(500));
        $this->assertSame([DemoGateway::class.': charging 500'], $gateway->log);   // shared code from the abstract class
        $this->assertSame('refunded pay_1', $gateway->refund('pay_1'));            // copied in by the trait
        $this->assertInstanceOf(Payable::class, $gateway);
        $this->assertContains(HasRefunds::class, class_uses($gateway));
        $this->assertTrue((new \ReflectionClass(Gateway::class))->isAbstract());
    }

    public function test_self_vs_static(): void
    {
        $this->assertSame(DemoPost::class, get_class(DemoPost::make()));            // late static binding
        $this->assertSame(BaseModel::class, get_class(DemoPost::makeSelf()));
    }

    public function test_loose_vs_strict_comparison(): void
    {
        $this->assertFalse(0 == 'abc');                                // PHP 8 (true in PHP 7!)
        $this->assertTrue('1' == '01');
        $this->assertTrue('10' == '1e1');
        $this->assertTrue(null == false);
        $this->assertFalse('1' === '01');
        $this->assertTrue(in_array('1e1', ['10']));                   // loose: surprising match
        $this->assertFalse(in_array('1e1', ['10'], true));            // strict
        $this->assertTrue(hash_equals('secret-token', 'secret-token'));   // constant-time for secrets
    }

    public function test_closures_and_arrow_functions(): void
    {
        $orders = [['total' => 500], ['total' => 1500], ['total' => 2500]];
        $min = 1000;

        $big1 = array_filter($orders, function ($o) use ($min) {
            return $o['total'] > $min;
        });
        $big2 = array_filter($orders, fn ($o) => $o['total'] > $min);   // captures $min automatically
        $this->assertSame($big1, $big2);
        $this->assertCount(2, $big2);

        $counter = 0;
        $inc = function () use (&$counter) {
            $counter++;
        };
        $inc();
        $inc();
        $this->assertSame(2, $counter);

        $byValue = fn () => $counter++;                                 // arrow fn captures BY VALUE
        $byValue();
        $this->assertSame(2, $counter);
    }

    public function test_enums(): void
    {
        $this->assertTrue(OrderStatus::Pending->canCancel());
        $this->assertFalse(OrderStatus::Paid->canCancel());
        $this->assertNull(OrderStatus::tryFrom('unknown'));
        $this->assertCount(5, OrderStatus::cases());

        $this->expectException(ValueError::class);
        OrderStatus::from('unknown');
    }

    public function test_psr4_autoloading_maps_namespaces_to_folders(): void
    {
        $composer = json_decode(file_get_contents(__DIR__.'/../../../composer.json'), true);

        $this->assertSame('app/', $composer['autoload']['psr-4']['App\\']);
        $this->assertContains('app/helpers.php', $composer['autoload']['files']);
        $this->assertStringEndsWith('app'.DIRECTORY_SEPARATOR.'Enums'.DIRECTORY_SEPARATOR.'OrderStatus.php', (new \ReflectionClass(OrderStatus::class))->getFileName());
    }
}
