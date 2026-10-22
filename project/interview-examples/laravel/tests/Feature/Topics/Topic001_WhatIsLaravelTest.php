<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 001: What is Laravel and Why Use It? (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic001
 *
 * A full page in three lines: route + Eloquent + Blade + pagination, all batteries included.
 */
class Topic001_WhatIsLaravelTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_three_line_route_renders_a_paginated_page(): void
    {
        Post::factory()->count(12)->create();

        $response = $this->get('/latest-posts');

        $response->assertOk()->assertViewIs('posts.index');
        $this->assertCount(10, $response->viewData('posts'));          // page 1 of 2
        $this->assertSame(12, $response->viewData('posts')->total());
    }
}
