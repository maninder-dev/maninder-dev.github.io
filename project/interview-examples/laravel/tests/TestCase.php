<?php

namespace Tests;

use App\Support\Trace;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Topic 98: no example may hit the real internet by accident.
        Http::preventStrayRequests();
    }

    /** Entries recorded by App\Support\Trace during the test. */
    protected function trace(): array
    {
        return app(Trace::class)->entries;
    }

    /** Run $callback and return the SQL statements it executed. */
    protected function queriesDuring(callable $callback): array
    {
        $queries = [];
        DB::listen(function ($query) use (&$queries) {
            $queries[] = $query->sql;
        });
        $callback();
        DB::flushQueryLog();

        return $queries;
    }
}
