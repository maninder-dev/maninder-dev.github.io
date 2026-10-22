<?php

namespace App\Facades;

use App\Services\CurrencyConverter;
use Illuminate\Support\Facades\Facade;

/** Topic 7: Currency::apiKey() is really app(CurrencyConverter::class)->apiKey via __callStatic. */
class Currency extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return CurrencyConverter::class;
    }
}
