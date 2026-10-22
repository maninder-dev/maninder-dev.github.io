{{-- Topic 45: an anonymous component (no PHP class) --}}
@props(['type' => 'info'])
<span {{ $attributes->class(["badge badge-{$type}"]) }}>{{ $slot }}</span>
