<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 017: Validation (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic017
 *
 * JSON requests get 422 + {"message", "errors"}; web requests are redirected back with errors
 * in the session and the old input flashed.
 */
class Topic017_ValidationTest extends TestCase
{
    public function test_json_requests_get_a_422_with_an_errors_object(): void
    {
        $this->postJson('/validate-demo', ['tags' => ['a', 'a'], 'type' => 'sale'])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['title', 'tags.0', 'discount']])
            ->assertJsonPath('errors.title.0', 'The title field is required.')
            ->assertJsonPath('errors.discount.0', 'The discount field is required when type is sale.');
    }

    public function test_web_requests_redirect_back_with_errors_and_old_input(): void
    {
        $this->from('/form')->post('/validate-demo', ['tags' => ['php']])
            ->assertRedirect('/form')
            ->assertSessionHasErrors(['title'])
            ->assertSessionHasInput('tags', ['php']);
    }

    public function test_valid_data_is_returned_by_validate(): void
    {
        $this->postJson('/validate-demo', ['title' => 'Sale', 'type' => 'sale', 'discount' => 20, 'extra' => 'dropped'])
            ->assertOk()
            ->assertExactJson(['title' => 'Sale', 'type' => 'sale', 'discount' => 20]);   // unvalidated keys never come back
    }
}
