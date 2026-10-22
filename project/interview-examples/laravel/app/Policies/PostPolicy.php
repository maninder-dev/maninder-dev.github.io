<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/** Topic 51: authorization rules for one model. Auto-discovered (Post -> PostPolicy). */
class PostPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasVerifiedEmail();
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): Response
    {
        return $user->id === $post->user_id || $user->isAdmin()
            ? Response::allow()
            : Response::deny('You can only delete your own posts.');
    }
}
