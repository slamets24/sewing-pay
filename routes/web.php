<?php

use App\Enums\UserRole;
use App\Http\Controllers\Sewing\ArticleController;
use App\Http\Controllers\Sewing\DeliveryController;
use App\Http\Controllers\Sewing\HancaanReceiptController;
use App\Http\Controllers\Sewing\ManagedUserController;
use App\Http\Controllers\Sewing\OverviewController;
use App\Http\Controllers\Sewing\PayoutController;
use App\Http\Controllers\Sewing\PickupController;
use App\Http\Controllers\Sewing\PortalController;
use App\Http\Controllers\Sewing\PublicPayoutSlipController;
use App\Http\Controllers\Sewing\QcShipmentController;
use App\Http\Controllers\Sewing\QuickDeskController;
use App\Http\Controllers\Sewing\RevisionController;
use App\Http\Controllers\Sewing\RevisionPartController;
use App\Http\Controllers\Sewing\TailorAttendanceController;
use App\Http\Controllers\Sewing\TailorController;
use App\Http\Controllers\Sewing\WorkOrderController;
use App\Http\Controllers\Sewing\WorkOrderItemController;
use Illuminate\Support\Facades\Route;

$owner = 'role:'.UserRole::Superadmin->value;
$warehouse = 'role:'.UserRole::Superadmin->value.','.UserRole::Admin->value;

Route::get('/', function () {
    $user = auth()->user();

    if ($user?->role === UserRole::Tailor || $user?->role === UserRole::Qc) {
        auth()->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('login')->withErrors([
            'email' => $user->role === UserRole::Tailor
                ? 'Penjahit masuk lewat tautan portal, bukan email.'
                : 'Aplikasi ini hanya untuk internal divisi jahit. Divisi QC tidak memiliki akses login.',
        ]);
    }

    return redirect()->route($user ? $user->role->homeRoute() : 'login');
});

Route::get('/slip-gaji/{invoiceNumber}/{token}', PublicPayoutSlipController::class)->name('payout-slips.public');

Route::post('/portal/{tailor:portal_token}/pin', [PortalController::class, 'storePin'])->middleware('throttle:10,1')->name('portal.pin.store');
Route::middleware('portal.pin')->group(function () {
    Route::get('/portal/{tailor:portal_token}', [PortalController::class, 'show'])->name('portal.show');
    Route::post('/portal/{tailor:portal_token}/absen', [PortalController::class, 'clock'])->name('portal.clock.store');
    Route::post('/portal/{tailor:portal_token}/kunci', [PortalController::class, 'lock'])->name('portal.lock');
});

Route::middleware('auth')->group(function () use ($owner, $warehouse) {
    Route::middleware($warehouse)->group(function () {
        Route::get('/beranda', OverviewController::class)->name('dashboard');

        Route::get('/wo', [WorkOrderController::class, 'index'])->name('work-orders.index');
        Route::get('/wo/baru', [WorkOrderController::class, 'create'])->name('work-orders.create');
        Route::post('/wo', [WorkOrderController::class, 'store'])->name('work-orders.store');
        Route::get('/wo/{workOrder}', [WorkOrderController::class, 'show'])->name('work-orders.show');
        Route::patch('/wo/{workOrder}', [WorkOrderController::class, 'update'])->name('work-orders.update');
        Route::delete('/wo/{workOrder}', [WorkOrderController::class, 'destroy'])->name('work-orders.destroy');
        Route::post('/wo/{workOrder}/items', [WorkOrderItemController::class, 'store'])->name('work-order-items.store');
        Route::patch('/wo-items/{item}', [WorkOrderItemController::class, 'update'])->name('work-order-items.update');
        Route::delete('/wo-items/{item}', [WorkOrderItemController::class, 'destroy'])->name('work-order-items.destroy');

        Route::post('/wo-items/{item}/hancaan', [HancaanReceiptController::class, 'store'])->name('hancaan-receipts.store');
        Route::post('/wo/{workOrder}/hancaan-semua', [HancaanReceiptController::class, 'receiveAll'])->name('hancaan-receipts.receive-all');
        Route::delete('/hancaan/{receipt}', [HancaanReceiptController::class, 'destroy'])->name('hancaan-receipts.destroy');

        Route::get('/loket', [QuickDeskController::class, 'index'])->name('desk.index');

        Route::get('/ambil', [PickupController::class, 'create'])->name('pickups.create');
        Route::post('/ambil', [PickupController::class, 'store'])->name('pickups.store');
        Route::post('/ambil/{pickupItem}/batal', [PickupController::class, 'cancelItem'])->name('pickup-items.cancel');

        Route::get('/setor', [DeliveryController::class, 'index'])->name('deliveries.index');
        Route::post('/ambil/{pickupItem}/setor', [DeliveryController::class, 'store'])->name('deliveries.store');
        Route::post('/penjahit/{tailor}/setor-semua', [DeliveryController::class, 'storeBatchForTailor'])->name('deliveries.batch-tailor');
        Route::delete('/setor/{delivery}', [DeliveryController::class, 'destroy'])->name('deliveries.destroy');

        Route::get('/kirim-qc', [QcShipmentController::class, 'index'])->name('qc-shipments.index');
        Route::post('/kirim-qc', [QcShipmentController::class, 'store'])->name('qc-shipments.store');
        Route::get('/kirim-qc/{shipment}/label', [QcShipmentController::class, 'labels'])->name('qc-shipments.labels');

        Route::get('/revisi', [RevisionController::class, 'index'])->name('revisions.index');
        Route::post('/revisi', [RevisionController::class, 'store'])->name('revisions.store');
        Route::post('/revisi/{revision}/lanjut', [RevisionController::class, 'advance'])->name('revisions.advance');
        Route::delete('/revisi/{revision}', [RevisionController::class, 'destroy'])->name('revisions.destroy');

        Route::get('/absensi', [TailorAttendanceController::class, 'index'])->name('attendances.index');
        Route::post('/absensi', [TailorAttendanceController::class, 'storeOrUpdate'])->name('attendances.store');
        Route::post('/absensi/hadir-semua', [TailorAttendanceController::class, 'batchPresent'])->name('attendances.batch');
        Route::delete('/absensi/{attendance}', [TailorAttendanceController::class, 'destroy'])->name('attendances.destroy');

        Route::get('/artikel', [ArticleController::class, 'index'])->name('articles.index');
        Route::post('/artikel', [ArticleController::class, 'store'])->name('articles.store');
    });

    Route::middleware($owner)->group(function () {
        Route::patch('/artikel/{article}', [ArticleController::class, 'update'])->name('articles.update');
        Route::post('/artikel/{article}/sample', [ArticleController::class, 'storeSample'])->name('articles.samples.store');
        Route::delete('/artikel/{article}/sample/{sample}', [ArticleController::class, 'destroySample'])->name('articles.samples.destroy');
        Route::post('/artikel/tarik-packingv2', [ArticleController::class, 'sync'])->name('articles.sync');

        Route::get('/penjahit', [TailorController::class, 'index'])->name('tailors.index');
        Route::post('/penjahit', [TailorController::class, 'store'])->name('tailors.store');
        Route::patch('/penjahit/{tailor}', [TailorController::class, 'update'])->name('tailors.update');
        Route::post('/penjahit/{tailor}/portal', [TailorController::class, 'openPortal'])->name('tailors.portal.store');
        Route::post('/penjahit/{tailor}/portal/pin', [TailorController::class, 'resetPortalPin'])->name('tailors.portal.pin.reset');
        Route::post('/penjahit/{tailor}/portal/tautan', [TailorController::class, 'regeneratePortal'])->name('tailors.portal.regenerate');

        Route::get('/bagian-revisi', [RevisionPartController::class, 'index'])->name('revision-parts.index');
        Route::post('/bagian-revisi', [RevisionPartController::class, 'store'])->name('revision-parts.store');
        Route::patch('/bagian-revisi/{revisionPart}', [RevisionPartController::class, 'update'])->name('revision-parts.update');

        Route::get('/pengguna', [ManagedUserController::class, 'index'])->name('users.index');
        Route::post('/pengguna', [ManagedUserController::class, 'store'])->name('users.store');
        Route::patch('/pengguna/{user}', [ManagedUserController::class, 'update'])->name('users.update');
        Route::patch('/pengguna/{user}/password', [ManagedUserController::class, 'resetPassword'])->name('users.password.update');

        Route::get('/gaji', [PayoutController::class, 'index'])->name('payouts.index');
        Route::post('/gaji', [PayoutController::class, 'store'])->name('payouts.store');
        Route::get('/gaji/{payout}', [PayoutController::class, 'show'])->name('payouts.show');
        Route::post('/gaji/{payout}/hitung-ulang', [PayoutController::class, 'regenerate'])->name('payouts.regenerate');
        Route::post('/gaji/{payout}/bayar-semua', [PayoutController::class, 'markAllPaid'])->name('payouts.paid');
        Route::delete('/gaji/{payout}', [PayoutController::class, 'destroy'])->name('payouts.destroy');
        Route::patch('/slip/{slip}', [PayoutController::class, 'updateSlip'])->name('payout-slips.update');
        Route::post('/slip/{slip}/bayar', [PayoutController::class, 'markSlipPaid'])->name('payout-slips.paid');
    });
});

require __DIR__.'/auth.php';
