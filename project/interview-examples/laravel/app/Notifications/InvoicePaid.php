<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Topic 64: one notification, two channels (mail + database). */
class InvoicePaid extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Invoice $invoice) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Payment received')
            ->line('We received your payment of Rs. '.number_format($this->invoice->amount / 100, 2).'.')
            ->action('View invoice', route('invoices.show', $this->invoice));
    }

    public function toArray(object $notifiable): array
    {
        return ['invoice_id' => $this->invoice->id];
    }
}
