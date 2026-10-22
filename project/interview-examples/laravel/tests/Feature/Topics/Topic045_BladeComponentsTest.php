<?php

namespace Tests\Feature\Topics;

use Tests\TestCase;

/**
 * Topic 045: Blade Components (Laravel Handbook, Part 4)
 * Run: php artisan test --filter=Topic045
 *
 * Class component (App\View\Components\Alert) with props, merged attributes and a named slot;
 * anonymous component (components/badge.blade.php) with @props.
 */
class Topic045_BladeComponentsTest extends TestCase
{
    public function test_class_component_props_attributes_and_slots(): void
    {
        $this->blade('<x-alert type="error" title="Payment failed" class="mb-4">Your card was declined.<x-slot:footer>Contact your bank</x-slot:footer></x-alert>')
            ->assertSee('class="alert alert-error mb-4"', false)        // merged class
            ->assertSee('role="alert"', false)
            ->assertSee('<strong>Payment failed</strong>', false)
            ->assertSee('Your card was declined.')
            ->assertSee('<footer>Contact your bank</footer>', false);
    }

    public function test_anonymous_component(): void
    {
        $this->blade('<x-badge type="success" id="b1">New</x-badge>')
            ->assertSee('<span class="badge badge-success" id="b1">New</span>', false);
    }
}
