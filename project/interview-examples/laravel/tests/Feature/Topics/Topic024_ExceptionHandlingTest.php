<?php

namespace Tests\Feature\Topics;

use App\Exceptions\CouponExpired;
use App\Exceptions\PaymentFailed;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 024: Exception Handling (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic024
 *
 * bootstrap/app.php ->withExceptions(): custom report() callback, custom render() for
 * ModelNotFoundException, dontReport(); plus a self-rendering exception (InsufficientStock).
 */
class Topic024_ExceptionHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_self_rendering_exception(): void
    {
        $this->get('/stock-demo')->assertStatus(409)->assertExactJson(['message' => 'Only a few items left. Reduce the quantity.']);
    }

    public function test_model_not_found_renders_custom_json(): void
    {
        $this->getJson('/posts/999')->assertNotFound()->assertExactJson(['message' => 'Record not found.']);
    }

    public function test_report_callback_and_dont_report(): void
    {
        $handler = app(ExceptionHandler::class);

        $handler->report(new PaymentFailed(42));
        $this->assertSame(['reported-payment-failure:order-42'], $this->trace());

        $this->assertFalse($handler->shouldReport(new CouponExpired('expired')));
        $this->assertTrue($handler->shouldReport(new PaymentFailed(1)));
    }
}
