<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate limiting general (60 req/min para usuarios, 300 para admins)
        RateLimiter::for('api', function (Request $request) {
            $limit = 60;

            if ($request->user() && $request->user()->isAdmin()) {
                $limit = 300;
            }

            return Limit::perMinute($limit)
                ->by($request->user()?->id ?: $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many requests. Please slow down.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });

        // Rate limiting para autenticación (5 req/min)
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)
                ->by(($request->email ?? '') . '|' . $request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Too many login attempts. Please try again later.',
                        'retry_after' => $headers['Retry-After'] ?? 60,
                    ], 429, $headers);
                });
        });
    }
}