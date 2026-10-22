<?php

namespace App\Actions;

use App\Enums\PostStatus;
use App\Events\PostPublished;
use App\Models\Post;
use DomainException;

/** Topic 83: an action does exactly one thing through one public method. */
class PublishPost
{
    public function execute(Post $post): Post
    {
        if ($post->status === PostStatus::Published) {
            throw new DomainException('This post is already published.');
        }

        $post->update(['status' => PostStatus::Published, 'published_at' => now()]);
        PostPublished::dispatch($post);

        return $post;
    }
}
