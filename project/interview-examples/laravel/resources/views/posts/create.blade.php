@extends('layouts.app')

@section('content')
    <form method="POST" action="{{ isset($post) ? route('posts.update', $post) : route('posts.store') }}">
        @csrf
        @isset($post) @method('PUT') @endisset
        <input name="title" value="{{ old('title', $post->title ?? '') }}">
        @error('title') <p class="error">{{ $message }}</p> @enderror
        <textarea name="body">{{ old('body', $post->body ?? '') }}</textarea>
        <button>Save</button>
    </form>
@endsection
