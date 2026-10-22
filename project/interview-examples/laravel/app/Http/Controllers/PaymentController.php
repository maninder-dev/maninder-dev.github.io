<?php

namespace App\Http\Controllers;

use App\Services\PaymentService;
use Illuminate\Http\Request;

/** Topic 4: Laravel builds PaymentService (and its gateway) for you: constructor auto-wiring. */
class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function store(Request $request)
    {
        return $this->payments->charge($request->user(), $request->integer('amount'));
    }
}
