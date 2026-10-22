<?php

namespace App\Services;

/** Topics 6 / 92: registered by a deferred provider, so it is only loaded when first needed. */
class GeoIp
{
    public function __construct(public readonly ?string $key = null) {}

    public function country(): string
    {
        return 'IN';
    }
}
