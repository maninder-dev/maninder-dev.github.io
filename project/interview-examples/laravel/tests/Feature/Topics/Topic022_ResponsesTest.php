<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 022: Responses (Laravel Handbook, Part 2)
 * Run: php artisan test --filter=Topic022
 */
class Topic022_ResponsesTest extends TestCase
{
    public function test_json_with_status(): void
    {
        $this->get('/responses/json')->assertCreated()->assertExactJson(['message' => 'Created']);
    }

    public function test_stream_download(): void
    {
        $response = $this->get('/responses/download')->assertOk()->assertDownload('orders.csv');
        $this->assertSame("id,total\n1,500\n", $response->streamedContent());
    }

    public function test_redirect_with_flash_no_content_and_abort(): void
    {
        $this->get('/responses/redirect')->assertRedirect(route('posts.index'))->assertSessionHas('status', 'Saved.');
        $this->get('/responses/empty')->assertNoContent();
        $this->getJson('/responses/forbidden')->assertForbidden()->assertJsonPath('message', 'You cannot edit this post.');
    }
}
