<?php

namespace Tests\Feature\Topics;

use App\Models\Country;
use App\Models\Post;
use App\Models\Role;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 027: Relationships (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic027
 *
 * hasOne, hasMany, belongsTo, belongsToMany (pivot data, attach/sync/toggle), latestOfMany,
 * polymorphic morphMany / morphToMany and hasManyThrough.
 */
class Topic027_RelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_one_to_one_one_to_many_and_latest_of_many(): void
    {
        $user = User::factory()->create();
        $user->profile()->create(['bio' => 'PHP dev']);
        $first = $user->posts()->create(['title' => 'First']);
        $latest = $user->posts()->create(['title' => 'New']);

        $this->assertSame('PHP dev', $user->profile->bio);
        $this->assertCount(2, $user->posts);
        $this->assertTrue($latest->is($user->latestPost));
        $this->assertTrue($first->author->is($user));
    }

    public function test_many_to_many_with_pivot_data(): void
    {
        $user = User::factory()->create();
        [$a, $b, $c] = collect(['admin', 'editor', 'viewer'])->map(fn ($n) => Role::create(['name' => $n]))->all();

        $user->roles()->attach($a->id, ['assigned_at' => now()]);
        $this->assertNotNull($user->roles()->first()->pivot->assigned_at);

        $user->roles()->sync([$a->id, $c->id]);           // exactly these
        $this->assertSame(['admin', 'viewer'], $user->roles()->orderBy('name')->pluck('name')->all());

        $user->roles()->toggle([$b->id, $c->id]);         // add editor, remove viewer
        $this->assertSame(['admin', 'editor'], $user->roles()->orderBy('name')->pluck('name')->all());
    }

    public function test_polymorphic_and_has_many_through(): void
    {
        $india = Country::create(['name' => 'India']);
        $user = User::factory()->create(['country_id' => $india->id]);
        $post = $user->posts()->create(['title' => 'Hello']);

        $post->comments()->create(['body' => 'Nice']);
        $post->tags()->attach(Tag::create(['name' => 'laravel']));

        $this->assertDatabaseHas('comments', ['commentable_type' => 'post', 'commentable_id' => $post->id]);
        $this->assertTrue($post->comments->first()->commentable->is($post));
        $this->assertSame(['Hello'], Tag::first()->posts->pluck('title')->all());
        $this->assertSame(['Hello'], $india->posts->pluck('title')->all());   // countries -> users -> posts
    }
}
