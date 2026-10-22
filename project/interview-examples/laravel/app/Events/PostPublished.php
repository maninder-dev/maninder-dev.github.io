<?php

namespace App\Events;

use App\Models\Post;
use Illuminate\Foundation\Events\Dispatchable;

/** Topic 83: fired by the PublishPost action. */
class PostPublished
{
    use Dispatchable;

    public function __construct(public Post $post) {}
}
