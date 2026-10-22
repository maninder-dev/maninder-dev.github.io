<?php

use Acme\Sms\SmsServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\GeoIpServiceProvider;

return [
    AppServiceProvider::class,
    GeoIpServiceProvider::class,
    // Topic 89: the in-repo package. A package installed through Composer would be
    // auto-discovered from its composer.json "extra.laravel.providers" instead.
    SmsServiceProvider::class,
];
