<?php

namespace Tests\Feature\Topics;

use App\Jobs\NotifyFollowers;
use App\Models\Order;
use App\Models\Post;
use App\Models\Product;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\MultipleRecordsFoundException;
use Illuminate\Database\RecordsNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Topic 094: Eloquent Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic094
 */
class Topic094_EloquentQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_first_find_fail_sole(): void
    {
        $a = Post::factory()->create();
        $b = Post::factory()->create();

        $this->assertInstanceOf(Collection::class, Post::where('status', 'draft')->get());
        $this->assertTrue(Post::where('status', 'draft')->first()->is($a));
        $this->assertNull(Post::find(999));
        $this->assertCount(2, Post::find([$a->id, $b->id]));
        $this->assertTrue(Post::whereKey($b->id)->sole()->is($b));

        try {
            Post::findOrFail(999);
            $this->fail();
        } catch (ModelNotFoundException) {
        }
        try {
            Post::where('status', 'draft')->sole();
            $this->fail();
        } catch (MultipleRecordsFoundException) {
        }
        $this->expectException(RecordsNotFoundException::class);
        Post::where('status', 'archived')->sole();
    }

    public function test_has_where_has_with_and_with_where_has(): void
    {
        $big = User::factory()->create();
        $big->orders()->createMany([['total' => 9000], ['total' => 100]]);
        User::factory()->create()->orders()->create(['total' => 100]);
        User::factory()->create();

        $this->assertSame(2, User::has('orders')->count());
        $this->assertSame([$big->id], User::whereHas('orders', fn ($q) => $q->where('total', '>', 5000))->pluck('id')->all());
        $this->assertCount(3, User::with('orders')->get());                       // with() never filters parents

        $users = User::withWhereHas('orders', fn ($q) => $q->where('total', '>', 5000))->get();
        $this->assertCount(1, $users);
        $this->assertCount(1, $users->first()->orders);                           // only the matching orders loaded
    }

    public function test_save_update_push(): void
    {
        $post = new Post(['title' => 'Hi']);
        $post->author()->associate(User::factory()->create());
        $post->save();                                                            // INSERT
        $queries = $this->queriesDuring(function () use ($post) {
            $post->title = 'Hello';
            $post->save();
        });
        $this->assertStringContainsString('update "posts" set "title" = ?', $queries[0]);   // only dirty columns

        $order = Order::factory()->hasItems(1, ['price' => 100, 'qty' => 1])->create();
        $order->load('items');
        $order->items[0]->qty = 3;
        $order->push();                                                           // saves order + items
        $this->assertSame(3, $order->items()->first()->qty);
    }

    public function test_mass_update_skips_observers_each_does_not(): void
    {
        Queue::fake();
        Post::factory()->count(2)->create();

        Post::where('status', 'draft')->update(['status' => 'published']);
        Queue::assertNothingPushed();

        Post::query()->update(['status' => 'draft']);
        Post::where('status', 'draft')->each(fn (Post $p) => $p->update(['status' => 'published']));
        Queue::assertPushed(NotifyFollowers::class, 2);
    }

    public function test_first_or_create_update_or_create_upsert(): void
    {
        $tag = Tag::firstOrCreate(['name' => 'laravel']);
        $this->assertTrue(Tag::firstOrCreate(['name' => 'laravel'])->is($tag));

        $product = Product::factory()->create(['sku' => 'A1', 'price' => 100]);
        Product::updateOrCreate(['sku' => 'A1'], ['price' => 200]);
        $this->assertSame(200, $product->fresh()->price);

        Product::upsert([
            ['sku' => 'A1', 'name' => 'A', 'price' => 499],
            ['sku' => 'B2', 'name' => 'B', 'price' => 899],
        ], uniqueBy: ['sku'], update: ['price']);
        $this->assertSame([499, 899], Product::orderBy('sku')->pluck('price')->all());
    }

    public function test_appended_computed_attribute(): void
    {
        $json = Order::factory()->create(['total' => 149_900])->toArray();

        $this->assertSame('Rs. 1,499.00', $json['total_formatted']);
    }
}
