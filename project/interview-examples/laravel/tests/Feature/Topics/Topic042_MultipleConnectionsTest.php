<?php

namespace Tests\Feature\Topics;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Topic 042: Multiple Database Connections and Read/Write Splitting (Laravel Handbook, Part 3)
 * Run: php artisan test --filter=Topic042
 *
 * Read/write splitting needs real MySQL replicas, so this test only asserts that
 * config/database.php is wired (read hosts, write host, sticky). The second connection
 * ("analytics", SQLite in-memory here) is real and used by a model via $connection.
 */
class Topic042_MultipleConnectionsTest extends TestCase
{
    public function test_mysql_read_write_split_is_configured(): void
    {
        $mysql = config('database.connections.mysql');

        $this->assertCount(2, $mysql['read']['host']);
        $this->assertSame(['10.0.0.10'], $mysql['write']['host']);
        $this->assertTrue($mysql['sticky']);
    }

    public function test_a_model_can_live_on_another_connection(): void
    {
        Schema::connection('analytics')->create('events', function (Blueprint $t) {
            $t->id();
            $t->string('name');
        });
        $event = new class extends Model
        {
            protected $connection = 'analytics';

            protected $table = 'events';

            public $timestamps = false;

            protected $guarded = [];
        };

        $event->newQuery()->create(['name' => 'page_view']);

        $this->assertSame(1, DB::connection('analytics')->table('events')->count());
        $this->assertFalse(Schema::hasTable('events'));                      // not on the default connection
    }
}
