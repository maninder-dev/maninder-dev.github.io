<div {{ $attributes->merge(['class' => "alert alert-{$type}"]) }} role="alert">
    @if ($title) <strong>{{ $title }}</strong> @endif
    {{ $slot }}
    @isset($footer) <footer>{{ $footer }}</footer> @endisset
</div>
