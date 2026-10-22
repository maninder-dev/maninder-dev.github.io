<?php

namespace Tests\Feature\Topics;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Vite;
use Tests\TestCase;

/**
 * Topic 047: Livewire, Inertia and Vite (Laravel Handbook, Part 4)
 * Run: php artisan test --filter=Topic047
 *
 * REDUCED: Livewire and Inertia are not installed (each pulls in a front-end toolchain and adds
 * nothing testable here beyond what Blade components show). This test covers the Vite part:
 * @vite reads public/<build>/manifest.json and prints hashed <link>/<script> tags.
 */
class Topic047_LivewireInertiaViteTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = public_path('vite-test');
        File::ensureDirectoryExists($this->dir);
        File::put("{$this->dir}/manifest.json", json_encode([
            'resources/css/app.css' => ['file' => 'assets/app-abc123.css', 'src' => 'resources/css/app.css', 'isEntry' => true],
            'resources/js/app.js' => ['file' => 'assets/app-def456.js', 'src' => 'resources/js/app.js', 'isEntry' => true],
        ]));
        Vite::useBuildDirectory('vite-test');
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        parent::tearDown();
    }

    public function test_vite_directive_prints_hashed_assets(): void
    {
        $this->blade("@vite(['resources/css/app.css', 'resources/js/app.js'])")
            ->assertSee('<link rel="stylesheet" href="http://localhost/vite-test/assets/app-abc123.css"', false)
            ->assertSee('<script type="module" src="http://localhost/vite-test/assets/app-def456.js"', false);
    }

    public function test_without_vite_for_tests_that_do_not_care(): void
    {
        $this->withoutVite();
        $this->blade("@vite('resources/js/app.js')")->assertDontSee('<script', false);
    }
}
