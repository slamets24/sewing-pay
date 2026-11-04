<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureValidInternalApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.internal_api.key');

        if ($expected === '') {
            return response()->json(['message' => 'Layanan internal API belum dikonfigurasi.'], 503);
        }

        $provided = (string) $request->header('X-Internal-Key');

        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
