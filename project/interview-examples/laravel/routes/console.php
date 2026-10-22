<?php

use App\Jobs\SyncExchangeRates;
use App\Models\ActivityLog;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Topic 63: one cron entry runs `php artisan schedule:run` every minute; Laravel decides what is due.
 *   * * * * * cd /var/www/app && php artisan schedule:run >> /dev/null 2>&1
 */
Schedule::command('logs:prune --days=30')->dailyAt('02:00');

Schedule::job(new SyncExchangeRates)->hourly()->withoutOverlapping();

Schedule::call(fn () => ActivityLog::create(['message' => 'heartbeat']))->everyFifteenMinutes()->name('heartbeat');

Schedule::command('model:prune')->daily();   // Topic 34: Prunable models

Schedule::command('inspire')->monthlyOn(1, '06:00')
    ->onOneServer();                         // only one server runs it (needs a shared cache)
