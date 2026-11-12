<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Services\GitHubApiException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(function (GitHubApiException $exception, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => $exception->getMessage(),
                    'retry_after' => $exception->retryAfter,
                ], $exception->status, $exception->retryAfter ? ['Retry-After' => (string) $exception->retryAfter] : []);
            }
        });
    })->create();
