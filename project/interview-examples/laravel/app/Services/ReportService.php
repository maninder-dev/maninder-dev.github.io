<?php

namespace App\Services;

use Illuminate\Contracts\Cache\Repository as Cache;

/** Topic 8: type-hint the Cache CONTRACT, not a concrete store. */
class ReportService
{
    public int $builds = 0;

    public function __construct(private Cache $cache) {}

    public function monthly(): array
    {
        return $this->cache->remember('report:monthly', 3600, fn () => $this->build());
    }

    private function build(): array
    {
        $this->builds++;

        return ['revenue' => 123_400];
    }
}
