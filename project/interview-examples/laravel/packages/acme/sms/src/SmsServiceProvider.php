<?php

namespace Acme\Sms;

use Acme\Sms\Commands\SendTestSms;
use Illuminate\Support\ServiceProvider;

/** Topic 89: everything a package wires up: config, bindings, publishable files, migrations, commands. */
class SmsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/sms.php', 'sms');
        $this->app->singleton(SmsClient::class, fn () => new SmsClient(config('sms.key'), config('sms.sender')));
    }

    public function boot(): void
    {
        $this->publishes([__DIR__.'/../config/sms.php' => config_path('sms.php')], 'sms-config');
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([SendTestSms::class]);
        }
    }
}
