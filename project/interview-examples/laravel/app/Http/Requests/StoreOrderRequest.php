<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Topics 71, 82, 85, 102: an order is a list of lines plus an optional coupon. */
class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:10'],
            'coupon' => ['nullable', 'string'],
        ];
    }
}
