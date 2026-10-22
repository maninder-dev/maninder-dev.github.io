<?php

namespace Database\Factories;

use App\Enums\PostStatus;
use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Topic 36: factory with a default state and a named state.
 *
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->unique()->sentence(4),
            'body' => fake()->paragraphs(3, true),
            'status' => PostStatus::Draft,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['status' => PostStatus::Published, 'published_at' => now()->subMinute()]);
    }
}
