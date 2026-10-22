<?php

namespace Tests\Feature\Topics;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpFoundation\Request as SymfonyRequest;
use Tests\TestCase;

/**
 * Topic 106: Laravel vs Other Frameworks (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic106
 *
 * The six-line "create a user" endpoint (routes/api.php): validation, hashing, persistence,
 * hidden fields and JSON with no extra wiring. Also: Laravel is built on Symfony components.
 */
class Topic106_LaravelVsOtherFrameworksTest extends TestCase
{
    use RefreshDatabase;

    public function test_six_line_endpoint(): void
    {
        $this->postJson('/api/users', ['name' => 'Ann', 'email' => 'ann@example.com', 'password' => 'secret-123'])
            ->assertCreated()
            ->assertJsonPath('name', 'Ann')
            ->assertJsonMissingPath('password');

        $this->postJson('/api/users', ['name' => 'Ann', 'email' => 'ann@example.com', 'password' => 'secret-123'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');      // unique:users
    }

    public function test_built_on_symfony_components(): void
    {
        $this->assertInstanceOf(SymfonyRequest::class, request());
    }
}
