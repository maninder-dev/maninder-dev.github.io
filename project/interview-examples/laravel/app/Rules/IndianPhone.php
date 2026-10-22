<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Topic 19: a reusable custom validation rule. */
class IndianPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! preg_match('/^[6-9]\d{9}$/', $value)) {
            $fail('The :attribute must be a valid 10-digit Indian mobile number.');
        }
    }
}
