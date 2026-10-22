<?php

namespace App\Jobs;

use App\Models\Post;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Topic 33: dispatched by PostObserver::updated when a post becomes published. */
class NotifyFollowers implements ShouldQueue
{
    use Queueable;

    public function __construct(public Post $post) {}

    public function handle(): void {}
}
