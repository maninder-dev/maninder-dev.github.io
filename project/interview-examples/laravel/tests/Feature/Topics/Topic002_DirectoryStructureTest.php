<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 002: Directory Structure (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic002
 *
 * Laravel 11+ slim skeleton: no Http/Kernel.php or Console/Kernel.php; bootstrap/app.php
 * configures routing, middleware and exceptions; schedules live in routes/console.php.
 */
class Topic002_DirectoryStructureTest extends TestCase
{
    public function test_the_conventional_folders_exist(): void
    {
        foreach (['app/Http/Controllers', 'app/Http/Middleware', 'app/Http/Requests', 'app/Models', 'app/Providers',
            'app/Jobs', 'app/Events', 'app/Listeners', 'app/Mail', 'app/Notifications', 'app/Policies',
            'config', 'database/migrations', 'database/factories', 'database/seeders', 'resources/views',
            'routes', 'storage/logs', 'tests/Feature', 'tests/Unit'] as $dir) {
            $this->assertDirectoryExists(base_path($dir), $dir);
        }
        foreach (['web.php', 'api.php', 'console.php', 'channels.php'] as $file) {
            $this->assertFileExists(base_path("routes/{$file}"));
        }
    }

    public function test_the_slim_skeleton_has_no_kernels(): void
    {
        $this->assertFileDoesNotExist(app_path('Http/Kernel.php'));
        $this->assertFileDoesNotExist(app_path('Console/Kernel.php'));
        $this->assertStringContainsString('withMiddleware', file_get_contents(base_path('bootstrap/app.php')));
        $this->assertSame(base_path('config'), config_path());
        $this->assertSame(base_path('storage'), storage_path());
    }
}
