{{-- Topic 44: template inheritance layout. Topic 46: $appName (shared) and $unreadCount (composer). --}}
<html>
<head><title>{{ $appName }}</title></head>
<body>
    <nav>@include('partials.nav')</nav>
    <span class="unread">Unread: {{ $unreadCount }}</span>
    <main>@yield('content')</main>
    @stack('scripts')
</body>
</html>
