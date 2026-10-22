<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

/** Topic 81: v2 changes the response shape (money as an object) without breaking v1 clients. */
class OrderController extends Controller
{
    public function index(Request $request)
    {
        return [
            'data' => Order::where('user_id', $request->user()->id)->get()->map(fn (Order $o) => [
                'id' => $o->id,
                'total' => ['amount' => $o->total->paise, 'currency' => 'INR', 'formatted' => $o->total->format()],
                'status' => $o->status->value,
            ]),
        ];
    }
}
