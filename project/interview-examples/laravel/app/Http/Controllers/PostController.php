<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePostRequest;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Topic 15: a resource controller (Route::resource gives the 7 conventional routes). */
class PostController extends Controller
{
    public function index()
    {
        return view('posts.index', ['posts' => Post::with('author')->latest('id')->paginate(10)]);
    }

    public function create()
    {
        return view('posts.create');
    }

    public function store(StorePostRequest $request)
    {
        $post = $request->user()->posts()->create($request->validated());

        return redirect()->route('posts.show', $post)->with('status', 'Post published.');
    }

    public function show(Post $post)
    {
        return view('posts.show', compact('post'));
    }

    public function edit(Post $post)
    {
        Gate::authorize('update', $post);

        return view('posts.create', compact('post'));
    }

    public function update(Request $request, Post $post)
    {
        Gate::authorize('update', $post);
        $post->update($request->validate(['title' => ['required', 'string', 'max:255']]));

        return redirect()->route('posts.show', $post);
    }

    public function destroy(Post $post)
    {
        Gate::authorize('delete', $post);
        $post->delete();

        return redirect()->route('posts.index');
    }
}
