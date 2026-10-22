<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

/** Topic 36: php artisan migrate:fresh --seed */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory(10)
            ->has(Post::factory()->count(5)->published())
            ->create();
    }
}
