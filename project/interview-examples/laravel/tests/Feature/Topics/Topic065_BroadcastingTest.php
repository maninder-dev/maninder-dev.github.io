<?php

namespace Tests\Feature\Topics;

use App\Events\MessageSent;
use App\Models\Message;
use App\Models\Room;
use App\Models\User;
use Illuminate\Broadcasting\Broadcasters\Broadcaster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Tests\TestCase;

/**
 * Topic 065: Broadcasting (Real-Time Events) (Laravel Handbook, Part 6)
 * Run: php artisan test --filter=Topic065
 *
 * No WebSocket server runs in tests (BROADCAST_CONNECTION=null). We assert the event class
 * (ShouldBroadcast, private channel, payload) and run the real channel authorization callback
 * from routes/channels.php through Laravel's own Broadcaster::verifyUserCanAccessChannel().
 */
class Topic065_BroadcastingTest extends TestCase
{
    use RefreshDatabase;

    private function authorizer(): Broadcaster
    {
        $broadcaster = new class extends Broadcaster
        {
            public function auth($request)
            {
                return $this->verifyUserCanAccessChannel($request, $request->input('channel_name'));
            }

            public function validAuthenticationResponse($request, $result)
            {
                return $result;
            }

            public function broadcast(array $channels, $event, array $payload = []) {}
        };
        foreach (Broadcast::getChannels() as $pattern => $callback) {
            $broadcaster->channel($pattern, $callback);
        }

        return $broadcaster;
    }

    public function test_event_broadcasts_on_a_private_channel(): void
    {
        Event::fake([MessageSent::class]);
        $user = User::factory()->create();
        $room = Room::create(['name' => 'general']);
        $message = Message::create(['room_id' => $room->id, 'user_id' => $user->id, 'body' => 'hi']);

        MessageSent::dispatch($message);

        Event::assertDispatched(MessageSent::class, function (MessageSent $e) use ($room) {
            return $e->broadcastOn()[0]->name === "private-chat.{$room->id}" && $e->broadcastWith()['body'] === 'hi';
        });
    }

    public function test_only_room_members_may_listen(): void
    {
        $room = Room::create(['name' => 'general']);
        $member = User::factory()->create();
        $room->users()->attach($member);
        $stranger = User::factory()->create();

        $request = fn (User $u) => tap(Request::create('/broadcasting/auth', 'POST', ['channel_name' => "chat.{$room->id}"]))
            ->setUserResolver(fn () => $u);

        $this->assertTrue($this->authorizer()->auth($request($member)));

        $this->expectException(AccessDeniedHttpException::class);
        $this->authorizer()->auth($request($stranger));
    }
}
