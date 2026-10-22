<?php

namespace Tests\Support;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

/**
 * Laravel skips CSRF checks while running tests. This subclass turns them back on so
 * Topic 21 can show the real 419 response.
 */
class StrictCsrf extends PreventRequestForgery
{
    protected function runningUnitTests()
    {
        return false;
    }
}
