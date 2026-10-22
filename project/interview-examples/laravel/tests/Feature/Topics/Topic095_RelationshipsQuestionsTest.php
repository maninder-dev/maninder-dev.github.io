<?php

namespace Tests\Feature\Topics;

use App\Models\Country;
use App\Models\Post;
use App\Models\Project;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 095: Relationships Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic095
 */
class Topic095_RelationshipsQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_pivot_with_extra_columns(): void
    {
        $project = Project::create(['name' => 'Apollo', 'tenant_id' => Tenant::create(['name' => 'T', 'subdomain' => 't'])->id]);
        $user = User::factory()->create();

        $project->members()->attach($user->id, ['role' => 'editor', 'joined_at' => now()]);
        $this->assertSame('editor', $project->members()->first()->pivot->role);

        $project->members()->updateExistingPivot($user->id, ['role' => 'owner']);
        $this->assertSame([$user->id], $project->members()->wherePivot('role', 'owner')->pluck('users.id')->all());
    }

    public function test_polymorphic_with_a_morph_map(): void
    {
        $post = Post::factory()->create();
        $video = Video::create(['title' => 'Intro']);
        $post->comments()->create(['body' => 'Great post']);
        $video->comments()->create(['body' => 'Great video']);

        $this->assertSame(['post' => Post::class, 'video' => Video::class, 'user' => User::class], Relation::morphMap());
        $this->assertDatabaseHas('comments', ['commentable_type' => 'video', 'body' => 'Great video']);
        $this->assertInstanceOf(Video::class, $video->comments->first()->commentable);
    }

    public function test_has_many_through_revenue_per_country(): void
    {
        $india = Country::create(['name' => 'India']);
        $user = User::factory()->create(['country_id' => $india->id]);
        $user->orders()->createMany([['total' => 1000, 'status' => 'paid'], ['total' => 500, 'status' => 'paid'], ['total' => 70, 'status' => 'pending']]);

        $this->assertEquals(1500, $india->orders()->where('status', 'paid')->sum('total'));
    }

    public function test_counts_without_loading(): void
    {
        $post = Post::factory()->create();
        $post->comments()->createMany([['body' => 'a', 'approved' => true], ['body' => 'b'], ['body' => 'c', 'approved' => true]]);

        $loaded = Post::withCount(['comments', 'comments as approved_count' => fn ($q) => $q->where('approved', true)])
            ->withExists('tags as tagged')
            ->first();

        $this->assertSame([3, 2, false], [$loaded->comments_count, $loaded->approved_count, $loaded->tagged]);
        $this->assertFalse($loaded->relationLoaded('comments'));
    }
}
