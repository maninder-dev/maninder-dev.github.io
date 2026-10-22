<?php

namespace App\Observers;

use App\Enums\PostStatus;
use App\Jobs\NotifyFollowers;
use App\Models\Post;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/** Topic 33: model events in one class, attached with #[ObservedBy] on Post. */
class PostObserver
{
    public function creating(Post $post): void
    {
        $post->slug ??= Str::slug($post->title);
    }

    public function updated(Post $post): void
    {
        if ($post->wasChanged('status') && $post->status === PostStatus::Published) {
            NotifyFollowers::dispatch($post);
        }
    }

    public function deleted(Post $post): void
    {
        Cache::forget("post:{$post->id}");
    }
}
