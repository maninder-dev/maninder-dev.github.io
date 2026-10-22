<?php

namespace App\ValueObjects;

/** Topic 90: constructor property promotion + readonly class (PHP 8.2). */
final readonly class Address
{
    public function __construct(public string $city, public string $pin) {}
}
