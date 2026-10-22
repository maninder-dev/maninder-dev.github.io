{{-- Topics 1, 37, 43: list page with pagination --}}
@extends('layouts.app')

@section('content')
    <h1>All posts</h1>
    @forelse ($posts as $post)
        <article @class(['post', 'post--featured' => $post->is_featured])>
            {{ $loop->iteration }}. {{ $post->title }} by {{ $post->author->name }}
        </article>
    @empty
        <p>No posts yet.</p>
    @endforelse
    {{ $posts->withQueryString()->links() }}
@endsection
