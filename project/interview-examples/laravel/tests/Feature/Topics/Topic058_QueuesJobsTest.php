<?php

namespace Tests\Feature\Topics;

use App\Jobs\GenerateInvoicePdf;
use App\Models\Order;
use App\Services\PdfService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * Topic 058: Queues and Jobs (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic058
 *
 * GenerateInvoicePdf: tries/timeout/backoff, onQueue/delay, injected handle() dependencies and
 * a failed() hook. Tests use the "sync" connection (runs immediately) or Queue::fake().
 */
class Topic058_QueuesJobsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dispatch_options_are_recorded(): void
    {
        Queue::fake();
        $order = Order::factory()->create();

        GenerateInvoicePdf::dispatch($order)->onQueue('pdfs')->delay(now()->addMinutes(2));

        Queue::assertPushedOn('pdfs', GenerateInvoicePdf::class, function (GenerateInvoicePdf $job) use ($order) {
            return $job->order->is($order) && $job->delay !== null;
        });
        $job = new GenerateInvoicePdf($order);
        $this->assertSame([5, 120, [10, 60, 300]], [$job->tries, $job->timeout, $job->backoff]);
    }

    public function test_the_job_does_the_work_when_run(): void
    {
        Storage::fake('local');
        $order = Order::factory()->create();

        GenerateInvoicePdf::dispatch($order);                   // sync connection in tests

        $this->assertSame("invoices/order-{$order->id}.pdf", $order->fresh()->invoice_path);
        Storage::disk('local')->assertExists($order->fresh()->invoice_path);
    }

    public function test_failed_hook_runs_when_the_job_throws(): void
    {
        $order = Order::factory()->create();
        $this->mock(PdfService::class)->shouldReceive('invoice')->andThrow(new RuntimeException('disk full'));

        try {
            GenerateInvoicePdf::dispatch($order);
        } catch (RuntimeException) {
        }

        $this->assertSame(["invoice-failed:{$order->id}:disk full"], $this->trace());
    }

    public function test_dispatch_after_response(): void
    {
        Queue::fake();
        GenerateInvoicePdf::dispatchAfterResponse(Order::factory()->create());

        Queue::assertNothingPushed();          // not queued at all: runs in-process after the response
    }
}
