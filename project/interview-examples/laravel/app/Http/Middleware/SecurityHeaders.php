<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Topics 54 / 105: security headers on every web response (appended to the web group). */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        return tap($next($request), function (Response $response) {
            $response->headers->set('X-Frame-Options', 'DENY');
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        });
    }
}
