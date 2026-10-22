<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use Illuminate\Console\Command;

/** Topic 10: a custom Artisan command with an option. Scheduled daily in routes/console.php. */
class PruneOldLogs extends Command
{
    protected $signature = 'logs:prune {--days=30 : Delete logs older than this}';

    protected $description = 'Delete old activity logs';

    public function handle(): int
    {
        $cutoff = now()->subDays((int) $this->option('days'));
        $count = ActivityLog::where('created_at', '<', $cutoff)->delete();
        $this->info("Deleted {$count} log entries.");

        return self::SUCCESS;
    }
}
