<?php

namespace Tests\Feature\Topics;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Topic 035: Migrations (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic035
 *
 * database/migrations/2026_01_01_000300_create_orders_table.php and the follow-up
 * ..._000400_add_currency_to_orders_table.php (change an existing table with a NEW migration).
 */
class Topic035_MigrationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_orders_table_columns_and_indexes(): void
    {
        $this->assertTrue(Schema::hasColumns('orders', ['id', 'user_id', 'status', 'total', 'meta', 'created_at', 'updated_at', 'currency']));

        $indexes = collect(Schema::getIndexes('orders'))->pluck('columns')->all();
        $this->assertContains(['status'], $indexes);
        $this->assertContains(['user_id', 'created_at'], $indexes);         // composite index

        $fk = collect(Schema::getForeignKeys('orders'))->firstWhere('foreign_table', 'users');
        $this->assertSame('cascade', strtolower($fk['on_delete']));
    }

    public function test_cascade_on_delete_and_default_status(): void
    {
        $user = User::factory()->create();
        DB::table('orders')->insert(['user_id' => $user->id, 'total' => 100]);
        $this->assertSame('pending', DB::table('orders')->value('status'));

        $user->delete();
        $this->assertSame(0, DB::table('orders')->count());
    }

    public function test_migrations_can_roll_back(): void
    {
        $path = 'database/migrations/2026_01_01_000400_add_currency_to_orders_table.php';
        $this->artisan('migrate:rollback', ['--path' => $path])->assertSuccessful();   // runs down()
        $this->assertFalse(Schema::hasColumn('orders', 'currency'));
        $this->artisan('migrate')->assertSuccessful();
        $this->assertTrue(Schema::hasColumn('orders', 'currency'));
    }
}
