<?php

use App\Http\Controllers\Api\ExternalPayrollApiController;
use App\Http\Controllers\Api\HrPayoutDecisionApiController;
use App\Http\Controllers\Api\PackingArticleApiController;
use App\Http\Controllers\Api\PackingWorkOrderApiController;
use App\Http\Controllers\Api\PingApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes for sweing-pay
|--------------------------------------------------------------------------
|
| Internal / server-to-server endpoints (e.g. for hr-azzahra portal).
|
*/

Route::prefix('v1/external')
    ->middleware(['internal.key', 'throttle:60,1'])
    ->group(function () {
        Route::get('/ping', PingApiController::class);
        Route::get('/payroll-slips', [ExternalPayrollApiController::class, 'index']);
        // hr-azzahra → OPSEW: HR acc / kembalikan pencairan gaji penjahit.
        Route::post('/payouts/{payout}/hr-decision', [HrPayoutDecisionApiController::class, 'store'])->whereNumber('payout');
    });

/*
| packingv2 → sweing-pay: WO Produksi dikirim saat dibuat dan setiap kali berubah (OPSEW ikut menyamakan),
| dihapus saat dinonaktifkan di packing (kalau belum dikerjakan), dan perubahan artikel ikut dikirim.
| packingv2 juga membaca progres produksinya.
| Header X-Api-Key = PACKINGV2_API_KEY (sama dengan SWEING_PAY_API_KEY di packingv2).
*/
Route::prefix('v1/packing')
    ->middleware(['packing.key', 'throttle:120,1'])
    ->group(function () {
        Route::get('/ping', PingApiController::class);
        Route::get('/work-orders/progress', [PackingWorkOrderApiController::class, 'summaries']);
        Route::get('/work-orders/{packingId}/progress', [PackingWorkOrderApiController::class, 'show'])->whereNumber('packingId');
        Route::put('/work-orders/{packingId}', [PackingWorkOrderApiController::class, 'store'])->whereNumber('packingId');
        Route::delete('/work-orders/{packingId}', [PackingWorkOrderApiController::class, 'destroy'])->whereNumber('packingId');
        Route::post('/articles/sync', [PackingArticleApiController::class, 'sync']);
    });
