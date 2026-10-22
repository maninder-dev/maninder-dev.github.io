<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Topic 65: who may listen on a private channel
Broadcast::channel('chat.{roomId}', fn (User $user, int $roomId) => $user->rooms()->whereKey($roomId)->exists());
