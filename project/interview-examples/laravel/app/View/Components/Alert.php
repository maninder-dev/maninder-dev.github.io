<?php

namespace App\View\Components;

use Illuminate\Contracts\View\View;
use Illuminate\View\Component;

/** Topic 45: a class-based Blade component: <x-alert type="error" title="...">...</x-alert>. */
class Alert extends Component
{
    public function __construct(public string $type = 'info', public ?string $title = null) {}

    public function render(): View
    {
        return view('components.alert');
    }
}
