<?php

namespace App\Services;

use Illuminate\Contracts\Mail\Mailer;

/** Topic 92: app(InvoiceMailer::class) builds Filesystem -> PdfRenderer -> InvoiceMailer by reflection. */
class InvoiceMailer
{
    public function __construct(public readonly PdfRenderer $pdf, public readonly Mailer $mail) {}
}
