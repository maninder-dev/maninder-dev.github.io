<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 029: Querying Relationships (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic029
 *
 * has / whereHas / doesntHave / whereRelation / whereBelongsTo filter PARENTS by their relations.
 */
class Topic029_QueryingRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_filtering_parents_by_relations(): void
    {
        $verified = User::factory()->create();
        $unverified = User::factory()->unverified()->create();

        $quiet = Post::factory()->create(['title' => 'quiet']);
        $busy = Post::factory()->create(['title' => 'busy']);
        $approved = Post::factory()->create(['title' => 'approved']);

        foreach (range(1, 10) as $i) {
            $busy->comments()->create(['body' => "c{$i}", 'user_id' => $unverified->id]);
        }
        $approved->comments()->create(['body' => 'ok', 'approved' => true, 'user_id' => $verified->id]);

        $this->assertEqualsCanonicalizing(['busy', 'approved'], Post::has('comments')->pluck('title')->all());
        $this->assertSame(['busy'], Post::has('comments', '>=', 10)->pluck('title')->all());
        $this->assertSame(['quiet'], Post::doesntHave('comments')->pluck('title')->all());
        $this->assertSame(['approved'], Post::whereHas('comments', fn ($q) => $q->where('approved', true)
            ->whereRelation('user', 'email_verified_at', '!=', null))->pluck('title')->all());
    }

    public function test_where_relation_and_where_belongs_to(): void
    {
        $user = User::factory()->create();
        $user->orders()->create(['total' => 150_000]);
        User::factory()->create()->orders()->create(['total' => 500]);
        Post::factory()->count(2)->for($user, 'author')->create();
        Post::factory()->create();

        $this->assertSame([$user->id], User::whereRelation('orders', 'total', '>', 100_000)->pluck('id')->all());
        $this->assertCount(2, Post::whereBelongsTo($user, 'author')->get());
    }
}
