<?php

// Topic 91: switch payment providers with one line of config, no caller changes.
return [
    'driver' => env('PAYMENTS_DRIVER', 'razorpay'),   // razorpay | stripe
];
