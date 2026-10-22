<?php

namespace Tests\Feature\Topics;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Topic 080: Deployment and Zero Downtime (Laravel Handbook, Part 8)
 * Run: php artisan test --filter=Topic080
 *
 * scripts/deploy.sh holds the steps (not executed here). Maintenance mode is real: `down` makes
 * every request 503 except for someone holding the secret bypass cookie, `up` restores it.
 */
class Topic080_DeploymentTest extends TestCase
{
    protected function tearDown(): void
    {
        $this->artisan('up');
        parent::tearDown();
    }

    public function test_deploy_script_steps_are_in_a_safe_order(): void
    {
        $script = File::get(base_path('scripts/deploy.sh'));
        $position = fn (string $step) => strpos($script, "\n{$step}");

        $order = ['composer install --no-dev', 'php artisan migrate --force', 'php artisan optimize', 'php artisan queue:restart', 'php artisan up'];
        $positions = array_map($position, $order);

        $this->assertNotContains(false, $positions);
        $sorted = $positions;
        sort($sorted);
        $this->assertSame($sorted, $positions);
    }

    public function test_maintenance_mode_with_a_secret_bypass(): void
    {
        $this->artisan('down', ['--secret' => 'let-me-in', '--retry' => 60])->assertSuccessful();

        $this->get('/hello')->assertStatus(503)->assertHeader('Retry-After', '60');
        $this->get('/let-me-in')->assertRedirect('/')->assertCookie('laravel_maintenance');

        $this->artisan('up')->assertSuccessful();
        $this->get('/hello')->assertOk();
    }
}
