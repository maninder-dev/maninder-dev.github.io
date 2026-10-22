<?php

namespace Tests\Feature\Topics;

use App\Services\ReportService;
use Illuminate\Cache\Repository;
use Illuminate\Contracts\Cache\Repository as CacheContract;
use Tests\TestCase;

/**
 * Topic 008: Contracts (Laravel Handbook, Part 1)
 * Run: php artisan test --filter=Topic008
 *
 * Contracts are the interfaces of Laravel's core services. Type-hinting one keeps the class
 * decoupled from the concrete store.
 */
class Topic008_ContractsTest extends TestCase
{
    public function test_the_contract_resolves_to_the_configured_store(): void
    {
        $this->assertInstanceOf(Repository::class, app(CacheContract::class));
    }

    public function test_service_depending_on_the_contract_caches_its_report(): void
    {
        $service = app(ReportService::class);

        $this->assertSame(['revenue' => 123_400], $service->monthly());
        $this->assertSame(['revenue' => 123_400], $service->monthly());
        $this->assertSame(1, $service->builds);       // second call came from the cache
    }
}
