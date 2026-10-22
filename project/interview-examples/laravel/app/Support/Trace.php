<?php

namespace App\Support;

/**
 * A tiny in-memory recorder (registered as a singleton) so tests can see the ORDER in which
 * things ran: middleware, controllers, chained jobs, listeners.
 */
class Trace
{
    /** @var list<string> */
    public array $entries = [];

    public function add(string $entry): void
    {
        $this->entries[] = $entry;
    }

    public static function record(string $entry): void
    {
        app(self::class)->add($entry);
    }
}
