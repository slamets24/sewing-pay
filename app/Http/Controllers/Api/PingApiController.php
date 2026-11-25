<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/external/ping dan /api/v1/packing/ping: untuk tombol "Tes koneksi" di HR dan Packing.
 * Sampai di sini berarti alamat benar dan kunci API diterima middleware.
 */
class PingApiController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'app' => 'opsew',
            'time' => now()->toIso8601String(),
        ]);
    }
}
