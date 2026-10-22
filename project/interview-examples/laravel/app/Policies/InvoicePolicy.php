<?php

namespace App\Policies;

use App\Models\Invoice;
use App\Models\User;

/** Topic 96: only the owner may download an invoice. */
class InvoicePolicy
{
    public function view(User $user, Invoice $invoice): bool
    {
        return $user->id === $invoice->user_id;
    }
}
