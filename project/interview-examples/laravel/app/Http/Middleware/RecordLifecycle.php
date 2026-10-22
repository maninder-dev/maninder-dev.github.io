<?php

namespace App\Http\Middleware;

use App\Support\Trace;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Topic 3: a terminable middleware that records where it sits in the request lifecycle. */
class RecordLifecycle
{
    public function handle(Request $request, Closure $next): Response
    {
        Trace::record('middleware:before');
        $response = $next($request);
        Trace::record('middleware:after');

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        Trace::record('terminate');   // runs after the response has been sent
    }
}
