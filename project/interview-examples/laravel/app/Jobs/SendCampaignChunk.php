<?php

namespace App\Jobs;

use App\Mail\CampaignMail;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Support\Facades\Mail;

/**
 * Topic 103: sends one chunk of a campaign. Rate limited to the mail provider, and it skips
 * anyone who already has a campaign_sends row, so a retried job never double-sends.
 */
class SendCampaignChunk implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;                 // a rate-limited release counts as an attempt

    public function __construct(public Campaign $campaign, public array $userIds) {}

    public function middleware(): array
    {
        return [new RateLimited('mail-provider')];
    }

    public function handle(): void
    {
        User::whereKey($this->userIds)
            ->whereDoesntHave('campaignSends', fn ($q) => $q->where('campaign_id', $this->campaign->id))
            ->each(function (User $user) {
                Mail::to($user)->send(new CampaignMail($this->campaign));
                $user->campaignSends()->create(['campaign_id' => $this->campaign->id]);
            });
    }
}
