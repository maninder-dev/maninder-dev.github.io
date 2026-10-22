<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Topic 24: a self-rendering exception. Laravel calls render() instead of the default 500 page. */
class InsufficientStock extends Exception
{
    public function __construct(public readonly string $product = '')
    {
        parent::__construct("Insufficient stock for {$product}.");
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Only a few items left. Reduce the quantity.'], 409);
    }
}
