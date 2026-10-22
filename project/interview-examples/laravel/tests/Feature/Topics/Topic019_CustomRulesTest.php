<?php

namespace Tests\Feature\Topics;

use App\Rules\IndianPhone;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

/**
 * Topic 019: Custom Validation Rules (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic019
 *
 * A ValidationRule class (IndianPhone) and an inline closure rule (coupon).
 */
class Topic019_CustomRulesTest extends TestCase
{
    public function test_rule_class(): void
    {
        $this->assertTrue(Validator::make(['phone' => '9876543210'], ['phone' => [new IndianPhone]])->passes());

        $v = Validator::make(['phone' => '1234567890'], ['phone' => [new IndianPhone]]);
        $this->assertTrue($v->fails());
        $this->assertSame('The phone must be a valid 10-digit Indian mobile number.', $v->errors()->first('phone'));
    }

    public function test_rule_class_and_closure_rule_over_http(): void
    {
        $this->postJson('/validate-demo', ['title' => 'x', 'phone' => '55555', 'coupon' => 'OLD'])
            ->assertStatus(422)
            ->assertJsonPath('errors.phone.0', 'The phone must be a valid 10-digit Indian mobile number.')
            ->assertJsonPath('errors.coupon.0', 'That coupon has expired.');

        $this->postJson('/validate-demo', ['title' => 'x', 'phone' => '9876543210', 'coupon' => 'DIWALI'])->assertOk();
    }
}
