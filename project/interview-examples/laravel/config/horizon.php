<?php

/*
 * Topic 61: Horizon supervisor config. laravel/horizon is NOT installed in this example app
 * (it needs a Redis server); this is the file `php artisan horizon:install` would publish,
 * trimmed to the parts interviews ask about. Run workers under Supervisor/systemd and call
 * `php artisan horizon:terminate` on every deploy.
 */
return [
    'use' => 'default',

    'prefix' => env('HORIZON_PREFIX', 'horizon:'),

    'waits' => ['redis:default' => 60],          // alert when a queue waits longer than 60s

    'trim' => ['recent' => 60, 'failed' => 10080], // minutes to keep job history

    'defaults' => [
        'supervisor-1' => [
            'connection' => 'redis',
            'queue' => ['default'],
            'balance' => 'auto',
            'maxProcesses' => 1,
            'tries' => 3,
            'timeout' => 60,
        ],
    ],

    'environments' => [
        'production' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['high', 'default'],
                'balance' => 'auto',
                'minProcesses' => 2,
                'maxProcesses' => 20,
                'tries' => 3,
            ],
            'mail-supervisor' => [                 // Topic 103: dedicated, rate-limited mail queue
                'connection' => 'redis',
                'queue' => ['mail'],
                'balance' => 'simple',
                'maxProcesses' => 4,
                'tries' => 5,
            ],
        ],
        'local' => [
            'supervisor-1' => ['maxProcesses' => 3],
        ],
    ],
];
