<?php

use App\Exceptions\CouponExpired;
use App\Exceptions\PaymentFailed;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureUserIsSubscribed;
use App\Http\Middleware\RecordLifecycle;
use App\Http\Middleware\SecurityHeaders;
use App\Support\Trace;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/*
 * Topic 2 / 3: the Laravel 11+ slim skeleton configures routing, middleware and exceptions here
 * (no Http/Kernel.php, no Exceptions/Handler.php).
 */
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Topic 20 / 93: aliases for parameterised middleware
        $middleware->alias([
            'subscribed' => EnsureUserIsSubscribed::class,
            'role' => EnsureRole::class,
            'lifecycle' => RecordLifecycle::class,
        ]);
        // Topic 105: security headers on every web response
        $middleware->web(append: [SecurityHeaders::class]);
        // Topic 21 / 104: webhooks carry their own HMAC signature, so they skip CSRF
        $middleware->validateCsrfTokens(except: ['webhooks/*']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Topic 24: custom reporting for one exception type
        $exceptions->report(function (PaymentFailed $e) {
            Trace::record("reported-payment-failure:order-{$e->orderId}");
        });

        // Topic 24: friendlier JSON for missing records. Laravel converts ModelNotFoundException
        // into a NotFoundHttpException before render callbacks run, so match on that.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($e->getPrevious() instanceof ModelNotFoundException && $request->expectsJson()) {
                return response()->json(['message' => 'Record not found.'], 404);
            }
        });

        // Topic 93: every API error has the same {message} shape (validation keeps Laravel's 422 format)
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || $e instanceof ValidationException || $e instanceof AuthenticationException) {
                return null;
            }
            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

            return response()->json([
                'message' => $status === 500 ? 'Something went wrong.' : $e->getMessage(),
            ], $status, $e instanceof HttpExceptionInterface ? $e->getHeaders() : []);
        });

        $exceptions->dontReport([CouponExpired::class]);
    })->create();
