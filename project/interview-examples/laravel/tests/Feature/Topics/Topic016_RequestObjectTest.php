<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 016: The Request Object (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic016
 *
 * Typed accessors (integer, boolean, array), only/filled, bearerToken and expectsJson.
 */
class Topic016_RequestObjectTest extends TestCase
{
    public function test_typed_input_helpers(): void
    {
        $this->withHeader('Authorization', 'Bearer abc123')
            ->getJson('/request-demo?q=shoes&page=3&active=on&tags[]=a&tags[]=b&name=Ann&email=ann@example.com&role=admin')
            ->assertExactJson([
                'q' => 'shoes',
                'page' => 3,                 // int, not "3"
                'active' => true,            // "on" -> true
                'tags' => ['a', 'b'],
                'only' => ['name' => 'Ann', 'email' => 'ann@example.com'],   // role is not included
                'has_email' => true,
                'expects_json' => true,
                'token' => 'abc123',
            ]);
    }

    public function test_defaults_when_input_is_missing(): void
    {
        $this->get('/request-demo')->assertJson([
            'q' => '', 'page' => 1, 'active' => false, 'tags' => [], 'has_email' => false,
            'expects_json' => false, 'token' => null,
        ]);
    }
}
