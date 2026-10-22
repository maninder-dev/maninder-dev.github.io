<?php

namespace Tests\Feature\Topics;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\InvoicePaid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 046: View Composers and Shared Data (Laravel Handbook, Part 4)
 * Run: php artisan test --filter=Topic046
 *
 * View::share('appName', ...) reaches every view; View::composer('layouts.app', ...) adds
 * $unreadCount whenever that layout renders (registered in AppServiceProvider::boot).
 */
class Topic046_ViewComposersTest extends TestCase
{
    use RefreshDatabase;

    public function test_shared_data_and_composer(): void
    {
        config(['app.name' => 'Laravel']);
        $this->view('demo.inherit')->assertSee('<title>Laravel</title>', false)->assertSee('Unread: 0');

        $user = User::factory()->create();
        $invoice = Invoice::create(['user_id' => $user->id, 'number' => 'INV-1', 'amount' => 100]);
        $user->notifyNow(new InvoicePaid($invoice), ['database']);
        $user->notifyNow(new InvoicePaid($invoice), ['database']);

        $this->actingAs($user);
        $this->view('demo.inherit')->assertSee('Unread: 2');
    }
}
