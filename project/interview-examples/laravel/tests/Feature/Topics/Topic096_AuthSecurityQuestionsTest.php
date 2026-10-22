<?php

namespace Tests\Feature\Topics;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Topic 096: Authentication and Security Questions (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic096
 *
 * Sanctum mobile login, gate vs policy, a private file download guarded by a policy.
 * (SQL injection: Topic 54. Session fixation: Topic 48.)
 */
class Topic096_AuthSecurityQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_login_issues_a_token(): void
    {
        $user = User::factory()->create(['password' => 'secret-pass']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong', 'device' => 'iPhone'])
            ->assertStatus(422)->assertJsonPath('errors.email.0', 'These credentials are incorrect.');

        $token = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'secret-pass', 'device' => 'iPhone'])
            ->assertOk()->json('token');

        $this->assertSame('iPhone', PersonalAccessToken::findToken($token)->name);
        $this->withToken($token)->getJson('/api/user')->assertJsonPath('id', $user->id);
    }

    public function test_gate_for_actions_policy_for_models(): void
    {
        $admin = User::factory()->admin()->create();

        $this->assertTrue(Gate::forUser($admin)->allows('view-dashboard'));     // gate: no model
        $this->assertNotNull(Gate::getPolicyFor(Invoice::class));                // policy: one model
    }

    public function test_private_download_only_for_the_owner(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        Storage::disk('local')->put('invoices/7.pdf', '%PDF');
        $invoice = Invoice::create(['user_id' => $owner->id, 'number' => 'INV-7', 'amount' => 1, 'pdf_path' => 'invoices/7.pdf']);

        $this->get("/invoices/{$invoice->id}/pdf")->assertRedirect('/login');
        $this->actingAs(User::factory()->create())->get("/invoices/{$invoice->id}/pdf")->assertForbidden();
        $this->actingAs($owner)->get("/invoices/{$invoice->id}/pdf")->assertOk()->assertDownload('invoice-INV-7.pdf');
    }
}
