<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Topics 62 / 72: sent by the SendOrderConfirmation listener. */
class OrderConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Order #{$this->order->id} confirmed");
    }

    public function content(): Content
    {
        return new Content(htmlString: "<p>Thanks! Your order total is {$this->order->total_formatted}.</p>");
    }
}
