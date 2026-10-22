<?php

namespace App\Mail;

use App\Models\Campaign;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** Topic 103: one campaign email. */
class CampaignMail extends Mailable
{
    public function __construct(public Campaign $campaign) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->campaign->subject);
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p>Big sale this weekend.</p>');
    }
}
