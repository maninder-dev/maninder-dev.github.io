<?php

namespace Tests\Feature\Topics;

use Acme\Sms\SmsClient;
use Acme\Sms\SmsServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Tests\TestCase;

/**
 * Topic 089: Building a Package (Laravel Handbook, Part 9)
 * Run: php artisan test --filter=Topic089
 *
 * packages/acme/sms: config merged under "sms", a singleton client, a publishable config file,
 * a migration and an artisan command. Autoloaded via the root composer.json PSR-4 entry and
 * registered in bootstrap/providers.php; its own composer.json has the extra.laravel block a
 * Composer-installed package would use for auto-discovery.
 */
class Topic089_BuildingAPackageTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_registers_config_and_singleton(): void
    {
        $this->assertArrayHasKey(SmsServiceProvider::class, $this->app->getLoadedProviders());
        $this->assertSame('sms-test-key', config('sms.key'));
        $this->assertSame(app(SmsClient::class), app(SmsClient::class));
    }

    public function test_publishable_config_migration_and_command(): void
    {
        $paths = ServiceProvider::pathsToPublish(SmsServiceProvider::class, 'sms-config');   // vendor:publish --tag=sms-config
        $this->assertSame(realpath(base_path('packages/acme/sms/config/sms.php')), realpath(array_key_first($paths)));
        $this->assertSame(config_path('sms.php'), $paths[array_key_first($paths)]);
        $this->assertTrue(Schema::hasTable('sms_logs'));                     // loadMigrationsFrom
        $this->assertArrayHasKey('sms:test', Artisan::all());

        $this->artisan('sms:test', ['to' => '9876543210'])->expectsOutput('Sent.')->assertSuccessful();
        $this->assertSame('9876543210', DB::table('sms_logs')->value('to'));
    }

    public function test_package_manifest_declares_auto_discovery(): void
    {
        $composer = json_decode(file_get_contents(base_path('packages/acme/sms/composer.json')), true);

        $this->assertSame([SmsServiceProvider::class], $composer['extra']['laravel']['providers']);
    }
}
