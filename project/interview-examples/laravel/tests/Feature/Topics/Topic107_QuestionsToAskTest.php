<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 107: Questions to Ask the Interviewer (Laravel Handbook, Part 10)
 * Run: php artisan test --filter=Topic107
 *
 * Not code, so this answers the first question for THIS project: which Laravel and PHP
 * versions are we on, and is there a test suite to protect upgrades?
 */
class Topic107_QuestionsToAskTest extends TestCase
{
    public function test_versions_this_handbook_app_runs_on(): void
    {
        $this->assertStringStartsWith('13.', $this->app->version());
        $this->assertTrue(version_compare(PHP_VERSION, '8.3.0', '>='));
    }

    public function test_every_topic_has_a_test(): void
    {
        $files = glob(__DIR__.'/Topic*Test.php');
        $numbers = array_map(fn ($f) => (int) substr(basename($f), 5, 3), $files);

        $this->assertSame(range(1, 107), array_values(array_unique($numbers)));
    }
}
