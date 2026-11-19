<?php

use App\Http\Controllers\Api\ExternalPayrollApiController;
use App\Http\Controllers\Api\PackingWorkOrderApiController;
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
        Route::get('/payroll-slips', [ExternalPayrollApiController::class, 'index']);
    });

/*
| packingv2 → sweing-pay: WO Produksi baru dikirim sekali (tidak pernah diubah/dihapus dari packingv2),
| lalu packingv2 hanya membaca progres produksinya.
| Header X-Api-Key = PACKINGV2_API_KEY (sama dengan SWEING_PAY_API_KEY di packingv2).
*/
Route::prefix('v1/packing')
    ->middleware(['packing.key', 'throttle:120,1'])
    ->group(function () {
        Route::get('/work-orders/progress', [PackingWorkOrderApiController::class, 'summaries']);
        Route::get('/work-orders/{packingId}/progress', [PackingWorkOrderApiController::class, 'show'])->whereNumber('packingId');
        Route::put('/work-orders/{packingId}', [PackingWorkOrderApiController::class, 'store'])->whereNumber('packingId');
    });
