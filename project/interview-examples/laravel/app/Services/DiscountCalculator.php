<?php

namespace App\Services;

/** Topic 74: a plain class with a business rule, unit tested without HTTP or a database. */
class DiscountCalculator
{
    public function apply(int $total): int
    {
        return $total > 1000 ? (int) round($total * 0.9) : $total;
    }
}
