<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Topic 65: pushed to the browser over WebSockets (Reverb/Pusher/Ably) on a private channel.
 * Who may listen is decided in routes/channels.php.
 */
class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("chat.{$this->message->room_id}")];
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->message->id, 'body' => $this->message->body];
    }
}
