<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 044: Layouts: Inheritance vs Components (Laravel Handbook, Part 4)
 * Run: php artisan test --filter=Topic044
 *
 * resources/views/layouts/app.blade.php (@yield/@stack/@include) used by demo/inherit.blade.php,
 * versus the component layout resources/views/components/layout.blade.php ({{ $slot }}).
 */
class Topic044_LayoutsTest extends TestCase
{
    public function test_template_inheritance(): void
    {
        $this->view('demo.inherit')
            ->assertSeeInOrder(['<nav>', 'Log in', '<main>', '<h1>All posts</h1>', '</main>', '<script src="/charts.js"></script>'], false);
    }

    public function test_component_layout(): void
    {
        $this->blade('<x-layout title="Posts"><h1>All posts</h1></x-layout>')
            ->assertSee('<title>Posts</title>', false)
            ->assertSee('<main><h1>All posts</h1></main>', false);
    }
}
