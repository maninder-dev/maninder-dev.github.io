<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 012: Routing Basics (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic012
 *
 * Verbs, constraints (whereNumber), match, redirects, optional parameters and named routes.
 */
class Topic012_RoutingBasicsTest extends TestCase
{
    public function test_constraints_and_verbs(): void
    {
        $this->get('/articles/5')->assertOk()->assertSee('Article 5');
        $this->get('/articles/abc')->assertNotFound();               // whereNumber rejects it
        $this->put('/articles/5')->assertSee('Updated 5');
        $this->patch('/articles/5')->assertSee('Updated 5');
        $this->delete('/articles/5')->assertStatus(405);              // wrong verb
    }

    public function test_redirect_and_optional_parameter(): void
    {
        $this->get('/old-blog')->assertStatus(301)->assertRedirect('/posts');
        $this->get('/hello')->assertSee('Hello guest');
        $this->get('/hello/Maninder')->assertSee('Hello Maninder');
    }

    public function test_urls_are_generated_by_name(): void
    {
        $this->assertSame('http://localhost/articles/5', route('articles.show', ['id' => 5]));
        $this->assertSame('/articles/5', route('articles.show', ['id' => 5], absolute: false));
    }
}
