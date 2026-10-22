<?php

namespace App\Services;

/** Topic 5: bound with singleton(), one object for the whole application lifetime. Topic 7: behind the Currency facade. */
class CurrencyConverter
{
    public function __construct(public readonly ?string $apiKey = null) {}

    public function toUsd(int $paise): float
    {
        return round($paise / 100 / 83, 2);
    }
}
