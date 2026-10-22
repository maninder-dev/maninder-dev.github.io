{{-- Topic 44: component layout (preferred in modern apps). Usage: <x-layout title="...">...</x-layout> --}}
@props(['title' => 'Home'])
<html><head><title>{{ $title }}</title></head><body><main>{{ $slot }}</main></body></html>
