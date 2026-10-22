<?php

namespace Tests\Feature\Topics;

use App\Jobs\SyncExchangeRates;
use App\Models\ActivityLog;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Topic 063: Task Scheduling (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic063
 *
 * routes/console.php defines the schedule; one cron line runs `schedule:run` every minute.
 */
class Topic063_SchedulingTest extends TestCase
{
    use RefreshDatabase;

    private function event(string $needle): Event
    {
        return collect(app(Schedule::class)->events())
            ->first(fn (Event $e) => str_contains((string) ($e->command ?? $e->description), $needle));
    }

    public function test_schedule_definitions(): void
    {
        $this->assertSame('0 2 * * *', $this->event('logs:prune')->expression);
        $this->assertStringContainsString('--days=30', $this->event('logs:prune')->command);

        $sync = $this->event(SyncExchangeRates::class);
        $this->assertSame('0 * * * *', $sync->expression);
        $this->assertTrue($sync->withoutOverlapping);

        $this->assertSame('*/15 * * * *', $this->event('heartbeat')->expression);
        $this->assertSame('0 6 1 * *', $this->event('inspire')->expression);
        $this->assertTrue($this->event('inspire')->onOneServer);
    }

    public function test_schedule_run_executes_due_tasks(): void
    {
        $this->travelTo(Carbon::parse('2026-03-10 10:15:00'));        // the 15-minute heartbeat is due

        $this->artisan('schedule:run')->assertSuccessful();

        $this->assertSame(1, ActivityLog::where('message', 'heartbeat')->count());
    }
}
