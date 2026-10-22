<?php

namespace Tests\Feature\Topics;

use App\Models\Order;
use App\Models\User;
use App\Repositories\EloquentOrderRepository;
use App\Repositories\OrderRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Topic 084: The Repository Pattern (and When Not to Use It) (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic084
 *
 * OrderRepository is bound to EloquentOrderRepository in AppServiceProvider; the API controller
 * depends on the interface, so a test (or a second data source) can swap it in one line.
 */
class Topic084_RepositoryPatternTest extends TestCase
{
    use RefreshDatabase;

    public function test_interface_resolves_to_the_eloquent_implementation(): void
    {
        $user = User::factory()->create();
        Order::factory()->count(3)->for($user)->create();
        Order::factory()->create();

        $repo = app(OrderRepository::class);
        $page = $repo->findForUser($user->id, perPage: 2);

        $this->assertInstanceOf(EloquentOrderRepository::class, $repo);
        $this->assertSame(3, $page->total());
        $this->assertTrue($page->first()->relationLoaded('items'));
    }

    public function test_swapping_the_implementation(): void
    {
        $this->app->instance(OrderRepository::class, new class implements OrderRepository
        {
            public function findForUser(int $userId, int $perPage = 15): LengthAwarePaginator
            {
                return new Paginator(collect([new Order(['total' => 1, 'status' => 'paid'])]), 1, $perPage);
            }
        });
        Sanctum::actingAs(User::factory()->create(), ['orders:read']);

        $this->getJson('/api/v1/orders')->assertJsonPath('data.0.status', 'paid');   // no DB rows needed
    }
}
