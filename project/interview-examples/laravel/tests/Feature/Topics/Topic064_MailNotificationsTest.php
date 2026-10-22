<?php

namespace Tests\Feature\Topics;

use App\Mail\OrderShipped;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\User;
use App\Notifications\InvoicePaid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Topic 064: Mail and Notifications (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic064
 *
 * A queued markdown Mailable, and a Notification sent through mail + database channels.
 */
class Topic064_MailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_mailable_subject_content_and_queueing(): void
    {
        $order = Order::factory()->create(['total' => 149_900]);
        $mail = new OrderShipped($order);

        $mail->assertHasSubject("Order #{$order->id} has shipped");
        $mail->assertSeeInHtml('Rs. 1,499.00');

        Mail::fake();
        Mail::to($order->user)->send($mail);                       // ShouldQueue -> queued, not sent
        Mail::assertQueued(OrderShipped::class, fn ($m) => $m->hasTo($order->user->email));
        Mail::assertNothingSent();
    }

    public function test_notification_channels(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $invoice = Invoice::create(['user_id' => $user->id, 'number' => 'INV-9', 'amount' => 49_900]);

        $user->notify(new InvoicePaid($invoice));

        Notification::assertSentTo($user, InvoicePaid::class, fn ($n, array $channels) => $channels === ['mail', 'database']);
    }

    public function test_notification_really_writes_mail_and_database_row(): void
    {
        $user = User::factory()->create();
        $invoice = Invoice::create(['user_id' => $user->id, 'number' => 'INV-9', 'amount' => 49_900]);

        $user->notify(new InvoicePaid($invoice));                  // sync queue + array mailer

        $this->assertSame(['invoice_id' => $invoice->id], $user->unreadNotifications->first()->data);
        $sent = app('mailer')->getSymfonyTransport()->messages();
        $this->assertCount(1, $sent);
        $this->assertSame('Payment received', $sent[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('Rs. 499.00', $sent[0]->getOriginalMessage()->getHtmlBody());
    }
}
