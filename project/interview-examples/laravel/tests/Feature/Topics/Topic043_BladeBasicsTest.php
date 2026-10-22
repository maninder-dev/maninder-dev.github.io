<?php

namespace Tests\Feature\Topics;

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Topic 043: Blade Templating Basics (Laravel Handbook, Part 4)
 * Run: php artisan test --filter=Topic043
 *
 * {{ }} escapes (XSS-safe), {!! !!} does not; @if/@foreach/$loop/@class/@forelse/@auth/@can.
 */
class Topic043_BladeBasicsTest extends TestCase
{
    use RefreshDatabase;

    public function test_escaped_versus_raw_output(): void
    {
        $evil = '<script>alert(1)</script>';

        $this->blade('<h1>{{ $t }}</h1>', ['t' => $evil])
            ->assertSee('&lt;script&gt;alert(1)&lt;/script&gt;', false)
            ->assertDontSee($evil, false);

        $this->blade('<div>{!! $t !!}</div>', ['t' => '<b>trusted</b>'])->assertSee('<b>trusted</b>', false);
    }

    public function test_loops_conditionals_and_class_directive(): void
    {
        $posts = collect([(object) ['title' => 'A', 'is_featured' => true], (object) ['title' => 'B', 'is_featured' => false]]);
        $tpl = '@foreach ($posts as $post)
<article @class(["post", "post--featured" => $post->is_featured])>{{ $loop->iteration }}. {{ $post->title }}</article>
@endforeach
'
            .'@forelse ($comments as $c) <p>{{ $c }}</p> @empty <p>No comments yet.</p> @endforelse';

        $this->blade($tpl, ['posts' => $posts, 'comments' => []])
            ->assertSee('<article class="post post--featured">1. A</article>', false)
            ->assertSee('<article class="post">2. B</article>', false)
            ->assertSee('No comments yet.');
    }

    public function test_auth_and_can_directives(): void
    {
        $tpl = '@auth <a>Dashboard</a> @endauth @guest <a>Log in</a> @endguest @can("update", $post) <a>Edit</a> @endcan';
        $owner = User::factory()->create();
        $post = Post::factory()->for($owner, 'author')->create();

        $this->blade($tpl, ['post' => $post])->assertSee('Log in')->assertDontSee('Edit');
        $this->actingAs($owner);
        $this->blade($tpl, ['post' => $post])->assertSee('Dashboard')->assertSee('Edit');
        $this->actingAs(User::factory()->create());
        $this->blade($tpl, ['post' => $post])->assertDontSee('Edit');
    }
}
