<?php

namespace Tests\Feature\Topics;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Topic 056: Signed URLs (Laravel Handbook, Part 5)
 * Run: php artisan test --filter=Topic056
 *
 * A temporary signed route works until it expires; changing any part of it breaks the signature.
 * The `signed` middleware answers 403 in both cases.
 */
class Topic056_SignedUrlsTest extends TestCase
{
    use RefreshDatabase;

    private function invoice(): Invoice
    {
        return Invoice::create(['user_id' => User::factory()->create()->id, 'number' => 'INV-42', 'amount' => 49900]);
    }

    public function test_valid_signed_url(): void
    {
        $url = URL::temporarySignedRoute('invoices.download', now()->addMinutes(30), ['invoice' => $this->invoice()]);

        $this->get($url)->assertOk()->assertSee('invoice INV-42');
    }

    public function test_tampered_or_unsigned_url_is_rejected(): void
    {
        $invoice = $this->invoice();
        $other = Invoice::create(['user_id' => $invoice->user_id, 'number' => 'INV-43', 'amount' => 1]);
        $url = URL::temporarySignedRoute('invoices.download', now()->addMinutes(30), ['invoice' => $invoice]);

        $this->get(str_replace("/invoices/{$invoice->id}/", "/invoices/{$other->id}/", $url))->assertForbidden();
        $this->get(route('invoices.download', $invoice))->assertForbidden();
    }

    public function test_expired_url_is_rejected(): void
    {
        $url = URL::temporarySignedRoute('invoices.download', now()->addMinutes(30), ['invoice' => $this->invoice()]);

        $this->travel(31)->minutes();

        $this->get($url)->assertForbidden();
    }
}
