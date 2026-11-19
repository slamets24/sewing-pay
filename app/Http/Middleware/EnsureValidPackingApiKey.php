<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Melindungi endpoint yang dipanggil packingv2. Kuncinya sama dengan PACKINGV2_API_KEY
 * (di packingv2: SWEING_PAY_API_KEY), dikirim lewat header X-Api-Key.
 */
class EnsureValidPackingApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.packingv2.key');

        if ($expected === '') {
            return response()->json(['message' => 'Integrasi Packing belum dikonfigurasi.'], 503);
        }

        $provided = (string) $request->header('X-Api-Key');

        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
