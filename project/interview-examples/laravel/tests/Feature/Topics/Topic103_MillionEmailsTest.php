<?php

namespace Tests\Feature\Topics;

use App\Jobs\SendCampaignChunk;
use App\Mail\CampaignMail;
use App\Models\Campaign;
use App\Models\CampaignSend;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/**
 * Topic 103: Scenario: Send 1 Million Emails (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic103
 *
 * SCALED DOWN: 25 subscribers, chunks of 10, a mail-provider limit of 2 jobs/minute.
 * campaign:send selects ids with chunkById and queues one SendCampaignChunk per chunk on the
 * "mail" queue (real database queue + worker). RateLimited releases extra jobs for later;
 * campaign_sends (unique campaign_id+user_id) guarantees a retried chunk never double-sends.
 */
class Topic103_MillionEmailsTest extends TestCase
{
    use RefreshDatabase;

    private function work(): void
    {
        Artisan::call('queue:work', ['connection' => 'database', '--queue' => 'mail', '--stop-when-empty' => true, '--sleep' => 0]);
    }

    public function test_campaign_is_chunked_rate_limited_and_never_double_sent(): void
    {
        config(['queue.default' => 'database']);
        RateLimiter::for('mail-provider', fn () => Limit::perMinute(2));    // scaled-down provider limit
        Mail::fake();
        User::factory()->count(25)->create(['subscribed' => true]);
        User::factory()->count(5)->create(['subscribed' => false]);
        $campaign = Campaign::create(['subject' => 'Diwali sale']);

        $this->artisan('campaign:send', ['campaign' => $campaign->id, '--chunk' => 10])
            ->expectsOutput('Queued 3 chunk jobs.')->assertSuccessful();
        $this->assertSame(3, DB::table('jobs')->where('queue', 'mail')->count());

        $this->work();                                                    // 2 chunks allowed this minute
        Mail::assertSentCount(20);
        $this->assertSame(1, DB::table('jobs')->count());                 // third chunk released for later

        $this->travel(2)->minutes();
        $this->work();
        Mail::assertSentCount(25);
        $unsubscribed = User::where('subscribed', false)->pluck('email');
        Mail::assertNotSent(CampaignMail::class, fn ($m) => $unsubscribed->contains(fn ($email) => $m->hasTo($email)));

        // A retry of an already-processed chunk (e.g. worker crashed after sending) sends nothing new
        SendCampaignChunk::dispatch($campaign, User::subscribed()->pluck('id')->all());
        $this->travel(2)->minutes();
        $this->work();
        Mail::assertSentCount(25);
        $this->assertSame(25, CampaignSend::count());
    }
}
