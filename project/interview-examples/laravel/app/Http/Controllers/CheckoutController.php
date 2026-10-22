<?php

namespace App\Http\Controllers;

use App\Exceptions\CardDeclined;
use App\Http\Requests\StoreOrderRequest;
use App\Jobs\GenerateInvoicePdf;
use App\Models\Invoice;
use App\Notifications\InvoicePaid;
use App\Services\CheckoutService;
use App\Support\Cart;

/**
 * Topics 72, 73, 82: a thin controller. Validate (form request), call the service, respond.
 */
class CheckoutController extends Controller
{
    public function __invoke(StoreOrderRequest $request, CheckoutService $checkout)
    {
        $user = $request->user();

        try {
            $order = $checkout->checkout($user, Cart::fromLines($request->validated('items')));
        } catch (CardDeclined $e) {
            return back()->withErrors(['payment' => $e->getMessage()]);
        }

        GenerateInvoicePdf::dispatch($order)->onQueue('pdfs');
        $invoice = Invoice::create(['user_id' => $user->id, 'number' => "INV-{$order->id}", 'amount' => $order->total->paise]);
        $user->notify(new InvoicePaid($invoice));

        return redirect()->route('orders.show', $order)->with('status', 'Order placed.');
    }
}
