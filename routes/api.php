<?php

use App\Http\Controllers\Api\ExternalPayrollApiController;
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
