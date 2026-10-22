<?php

namespace App\Console\Commands;

use App\Jobs\SendCampaignChunk;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Console\Command;

/** Topic 103: select recipients with chunkById (flat memory) and queue one job per chunk. */
class SendCampaign extends Command
{
    protected $signature = 'campaign:send {campaign} {--chunk=500}';

    protected $description = 'Queue a campaign to every subscribed user';

    public function handle(): int
    {
        $campaign = Campaign::findOrFail($this->argument('campaign'));
        $jobs = 0;

        User::subscribed()->select('id')->chunkById((int) $this->option('chunk'), function ($users) use ($campaign, &$jobs) {
            SendCampaignChunk::dispatch($campaign, $users->pluck('id')->all())->onQueue('mail');
            $jobs++;
        });

        $this->info("Queued {$jobs} chunk jobs.");

        return self::SUCCESS;
    }
}
