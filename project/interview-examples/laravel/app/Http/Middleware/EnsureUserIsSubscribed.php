<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Topic 20: middleware with a parameter (subscribed:pro), acting before AND after the controller. */
class EnsureUserIsSubscribed
{
    public function handle(Request $request, Closure $next, string $plan = 'basic'): Response
    {
        if (! $request->user()?->subscribedTo($plan)) {
            return redirect()->route('billing')->with('status', 'Upgrade to access this page.');
        }

        $response = $next($request);                 // controller runs here
        $response->headers->set('X-Plan', $plan);    // "after" middleware

        return $response;
    }
}
