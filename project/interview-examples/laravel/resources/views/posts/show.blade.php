@extends('layouts.app')

@section('content')
    @if (session('status')) <p class="status">{{ session('status') }}</p> @endif
    <h1>{{ $post->title }}</h1>
    <div>{{ $post->body }}</div>
    @can('update', $post) <a href="{{ route('posts.edit', $post) }}">Edit</a> @endcan
@endsection
