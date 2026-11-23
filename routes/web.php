<?php

use App\Enums\Ability;
use App\Http\Controllers\Sewing\ActivityLogController;
use App\Http\Controllers\Sewing\ArticleController;
use App\Http\Controllers\Sewing\CuttingReceiptController;
use App\Http\Controllers\Sewing\DeliveryController;
use App\Http\Controllers\Sewing\HancaanReceiptController;
use App\Http\Controllers\Sewing\MakloonPaymentController;
use App\Http\Controllers\Sewing\ManagedUserController;
use App\Http\Controllers\Sewing\OverviewController;
use App\Http\Controllers\Sewing\PackingWorkOrderPullController;
use App\Http\Controllers\Sewing\PayoutController;
use App\Http\Controllers\Sewing\PickupController;
use App\Http\Controllers\Sewing\ProductionReportController;
use App\Http\Controllers\Sewing\PublicPayoutSlipController;
use App\Http\Controllers\Sewing\QcShipmentController;
use App\Http\Controllers\Sewing\QuickDeskController;
use App\Http\Controllers\Sewing\RevisionController;
use App\Http\Controllers\Sewing\RevisionPartController;
use App\Http\Controllers\Sewing\RoleController;
use App\Http\Controllers\Sewing\TailorAttendanceController;
use App\Http\Controllers\Sewing\TailorController;
use App\Http\Controllers\Sewing\VendorJobController;
use App\Http\Controllers\Sewing\WorkOrderController;
use App\Http\Controllers\Sewing\WorkOrderItemController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    $user = auth()->user();
    $home = $user?->homeRoute();

    if ($user && $home === null) {
        $message = $user->isTailor()
            ? 'Penjahit menggunakan Portal Karyawan HR Azzahra.'
            : ($user->canLogin()
                ? 'Peran Anda belum diberi akses menu apa pun. Hubungi Owner.'
                : 'Aplikasi ini hanya untuk internal divisi jahit. Peran Anda tidak memiliki akses login.');

        auth()->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('login')->withErrors(['email' => $message]);
    }

    return redirect()->route($home ?? 'login');
});

Route::get('/slip-gaji/{invoiceNumber}/{token}', PublicPayoutSlipController::class)->name('payout-slips.public');

// Every staff page is guarded by an Ability (app/Enums/Ability.php). Which roles hold it is set in Master Data › Role & Akses.
Route::middleware('auth')->group(function () {
    Route::get('/beranda', OverviewController::class)->name('dashboard')->middleware('can:'.Ability::DashboardView->value);

    Route::get('/wo', [WorkOrderController::class, 'index'])->name('work-orders.index')->middleware('can:'.Ability::WorkOrdersView->value);
    Route::get('/wo/baru', [WorkOrderController::class, 'create'])->name('work-orders.create')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::post('/wo/tarik-packing', PackingWorkOrderPullController::class)->name('work-orders.pull-packing')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::post('/wo', [WorkOrderController::class, 'store'])->name('work-orders.store')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::get('/wo/{workOrder}', [WorkOrderController::class, 'show'])->name('work-orders.show')->middleware('can:'.Ability::WorkOrdersView->value);
    Route::patch('/wo/{workOrder}', [WorkOrderController::class, 'update'])->name('work-orders.update')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::delete('/wo/{workOrder}', [WorkOrderController::class, 'destroy'])->name('work-orders.destroy')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::post('/wo/{workOrder}/items', [WorkOrderItemController::class, 'store'])->name('work-order-items.store')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::patch('/wo-items/{item}', [WorkOrderItemController::class, 'update'])->name('work-order-items.update')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::delete('/wo-items/{item}', [WorkOrderItemController::class, 'destroy'])->name('work-order-items.destroy')->middleware('can:'.Ability::WorkOrdersManage->value);
    Route::post('/wo-items/{item}/mundur', [WorkOrderItemController::class, 'stepBack'])->name('work-order-items.step-back')->middleware('can:'.Ability::WorkOrdersManage->value);

    Route::post('/wo-items/{item}/cutting', [CuttingReceiptController::class, 'store'])->name('cutting-receipts.store')->middleware('can:'.Ability::CuttingManage->value);
    Route::patch('/cutting/{receipt}', [CuttingReceiptController::class, 'update'])->name('cutting-receipts.update')->middleware('can:'.Ability::CuttingManage->value);
    Route::post('/wo/{workOrder}/cutting-semua', [CuttingReceiptController::class, 'transferAll'])->name('cutting-receipts.transfer-all')->middleware('can:'.Ability::CuttingManage->value);
    Route::post('/wo/{workOrder}/cutting-batch', [CuttingReceiptController::class, 'transferBatch'])->name('cutting-receipts.batch')->middleware('can:'.Ability::CuttingManage->value);
    Route::delete('/cutting/{receipt}', [CuttingReceiptController::class, 'destroy'])->name('cutting-receipts.destroy')->middleware('can:'.Ability::CuttingManage->value);

    Route::post('/wo-items/{item}/hancaan', [HancaanReceiptController::class, 'store'])->name('hancaan-receipts.store')->middleware('can:'.Ability::HancaanManage->value);
    Route::patch('/hancaan/{receipt}', [HancaanReceiptController::class, 'update'])->name('hancaan-receipts.update')->middleware('can:'.Ability::HancaanManage->value);
    Route::post('/wo/{workOrder}/hancaan-semua', [HancaanReceiptController::class, 'receiveAll'])->name('hancaan-receipts.receive-all')->middleware('can:'.Ability::HancaanManage->value);
    Route::post('/wo/{workOrder}/hancaan-batch', [HancaanReceiptController::class, 'receiveBatch'])->name('hancaan-receipts.batch')->middleware('can:'.Ability::HancaanManage->value);
    Route::delete('/hancaan/{receipt}', [HancaanReceiptController::class, 'destroy'])->name('hancaan-receipts.destroy')->middleware('can:'.Ability::HancaanManage->value);

    Route::post('/wo/{workOrder}/vendor-kirim', [VendorJobController::class, 'send'])->name('vendor-jobs.send')->middleware('can:'.Ability::VendorProcessManage->value);
    Route::post('/wo/{workOrder}/vendor-terima', [VendorJobController::class, 'receive'])->name('vendor-jobs.receive')->middleware('can:'.Ability::VendorProcessManage->value);
    Route::delete('/vendor/{vendorJob}', [VendorJobController::class, 'destroy'])->name('vendor-jobs.destroy')->middleware('can:'.Ability::VendorProcessManage->value);
    Route::delete('/vendor-terima/{vendorJobReturn}', [VendorJobController::class, 'undoReturn'])->name('vendor-job-returns.destroy')->middleware('can:'.Ability::VendorProcessManage->value);

    Route::get('/loket', [QuickDeskController::class, 'index'])->name('desk.index')->middleware('can:'.Ability::DeskUse->value);

    Route::get('/ambil', [PickupController::class, 'create'])->name('pickups.create')->middleware('can:'.Ability::PickupsManage->value);
    Route::post('/ambil', [PickupController::class, 'store'])->name('pickups.store')->middleware('can:'.Ability::PickupsManage->value);
    Route::post('/ambil/{pickupItem}/batal', [PickupController::class, 'cancelItem'])->name('pickup-items.cancel')->middleware('can:'.Ability::PickupsManage->value);

    Route::get('/setor', [DeliveryController::class, 'index'])->name('deliveries.index')->middleware('can:'.Ability::DeliveriesManage->value);
    Route::post('/ambil/{pickupItem}/setor', [DeliveryController::class, 'store'])->name('deliveries.store')->middleware('can:'.Ability::DeliveriesManage->value);
    Route::post('/penjahit/{tailor}/setor-semua', [DeliveryController::class, 'storeBatchForTailor'])->name('deliveries.batch-tailor')->middleware('can:'.Ability::DeliveriesManage->value);
    Route::delete('/setor/{delivery}', [DeliveryController::class, 'destroy'])->name('deliveries.destroy')->middleware('can:'.Ability::DeliveriesManage->value);

    Route::get('/kirim-qc', [QcShipmentController::class, 'index'])->name('qc-shipments.index')->middleware('can:'.Ability::QcShipmentsManage->value);
    Route::post('/kirim-qc', [QcShipmentController::class, 'store'])->name('qc-shipments.store')->middleware('can:'.Ability::QcShipmentsManage->value);
    Route::get('/kirim-qc/{shipment}/label', [QcShipmentController::class, 'labels'])->name('qc-shipments.labels')->middleware('can:'.Ability::QcShipmentsManage->value);

    Route::get('/revisi', [RevisionController::class, 'index'])->name('revisions.index')->middleware('can:'.Ability::RevisionsManage->value);
    Route::post('/revisi', [RevisionController::class, 'store'])->name('revisions.store')->middleware('can:'.Ability::RevisionsManage->value);
    Route::post('/revisi/{revision}/lanjut', [RevisionController::class, 'advance'])->name('revisions.advance')->middleware('can:'.Ability::RevisionsManage->value);
    Route::post('/revisi/{revision}/alihkan', [RevisionController::class, 'reassign'])->name('revisions.reassign')->middleware('can:'.Ability::RevisionsManage->value);
    Route::delete('/revisi/{revision}', [RevisionController::class, 'destroy'])->name('revisions.destroy')->middleware('can:'.Ability::RevisionsManage->value);

    Route::get('/absensi', [TailorAttendanceController::class, 'index'])->name('attendances.index')->middleware('can:'.Ability::AttendancesManage->value);
    Route::post('/absensi', [TailorAttendanceController::class, 'storeOrUpdate'])->name('attendances.store')->middleware('can:'.Ability::AttendancesManage->value);
    Route::post('/absensi/hadir-semua', [TailorAttendanceController::class, 'batchPresent'])->name('attendances.batch')->middleware('can:'.Ability::AttendancesManage->value);
    Route::post('/absensi/tarik-hr', [TailorAttendanceController::class, 'pullFromHr'])->name('attendances.pull-hr')->middleware('can:'.Ability::AttendancesManage->value);
    Route::post('/absensi/hari-target', [TailorAttendanceController::class, 'saveTargetDay'])->name('attendances.target-day.save')->middleware('can:'.Ability::AttendancesManage->value);
    Route::delete('/absensi/hari-target', [TailorAttendanceController::class, 'removeTargetDay'])->name('attendances.target-day.remove')->middleware('can:'.Ability::AttendancesManage->value);
    Route::put('/absensi/aturan-uang-makan', [TailorAttendanceController::class, 'updateMealSettings'])->name('attendances.meal-settings')->middleware('can:'.Ability::PayoutsManage->value);
    Route::delete('/absensi/{attendance}', [TailorAttendanceController::class, 'destroy'])->name('attendances.destroy')->middleware('can:'.Ability::AttendancesManage->value);

    Route::get('/rekap-produksi', [ProductionReportController::class, 'index'])->name('production-reports.index')->middleware('can:'.Ability::ProductionReportsView->value);

    Route::get('/artikel', [ArticleController::class, 'index'])->name('articles.index')->middleware('can:'.Ability::ArticlesView->value);
    Route::post('/artikel', [ArticleController::class, 'store'])->name('articles.store')->middleware('can:'.Ability::ArticlesCreate->value);

    Route::get('/pengguna', [ManagedUserController::class, 'index'])->name('users.index')->middleware('can:'.Ability::UsersManage->value);
    Route::post('/pengguna', [ManagedUserController::class, 'store'])->name('users.store')->middleware('can:'.Ability::UsersManage->value);
    Route::patch('/pengguna/{user}', [ManagedUserController::class, 'update'])->name('users.update')->middleware('can:'.Ability::UsersManage->value);
    Route::patch('/pengguna/{user}/password', [ManagedUserController::class, 'resetPassword'])->name('users.password.update')->middleware('can:'.Ability::UsersManage->value);

    Route::delete('/wo/{workOrder}/hapus-total', [WorkOrderController::class, 'purge'])->name('work-orders.purge')->middleware('can:'.Ability::WorkOrdersPurge->value);
    Route::patch('/artikel/{article}', [ArticleController::class, 'update'])->name('articles.update')->middleware('can:'.Ability::ArticlesUpdate->value);
    Route::post('/artikel/{article}/sample', [ArticleController::class, 'storeSample'])->name('articles.samples.store')->middleware('can:'.Ability::ArticlesSamples->value);
    Route::delete('/artikel/{article}/sample/{sample}', [ArticleController::class, 'destroySample'])->name('articles.samples.destroy')->middleware('can:'.Ability::ArticlesSamples->value);
    Route::post('/artikel/tarik-packingv2', [ArticleController::class, 'sync'])->name('articles.sync')->middleware('can:'.Ability::ArticlesSync->value);
    Route::post('/artikel/{article}/minta-barcode-packing', [ArticleController::class, 'provisionPacking'])->name('articles.provision-packing')->middleware('can:'.Ability::ArticlesSync->value);

    Route::get('/penjahit', [TailorController::class, 'index'])->name('tailors.index')->middleware('can:'.Ability::TailorsManage->value);
    Route::post('/penjahit/sinkron-hr', [TailorController::class, 'syncHr'])->name('tailors.sync-hr')->middleware('can:'.Ability::TailorsSyncHr->value);
    Route::post('/penjahit', [TailorController::class, 'store'])->name('tailors.store')->middleware('can:'.Ability::TailorsManage->value);
    Route::patch('/penjahit/{tailor}', [TailorController::class, 'update'])->name('tailors.update')->middleware('can:'.Ability::TailorsManage->value);

    Route::get('/bagian-revisi', [RevisionPartController::class, 'index'])->name('revision-parts.index')->middleware('can:'.Ability::RevisionPartsManage->value);
    Route::post('/bagian-revisi', [RevisionPartController::class, 'store'])->name('revision-parts.store')->middleware('can:'.Ability::RevisionPartsManage->value);
    Route::patch('/bagian-revisi/{revisionPart}', [RevisionPartController::class, 'update'])->name('revision-parts.update')->middleware('can:'.Ability::RevisionPartsManage->value);

    Route::get('/gaji', [PayoutController::class, 'index'])->name('payouts.index')->middleware('can:'.Ability::PayoutsView->value);
    Route::post('/gaji', [PayoutController::class, 'store'])->name('payouts.store')->middleware('can:'.Ability::PayoutsManage->value);
    Route::get('/gaji/{payout}', [PayoutController::class, 'show'])->name('payouts.show')->middleware('can:'.Ability::PayoutsView->value);
    Route::post('/gaji/{payout}/hitung-ulang', [PayoutController::class, 'regenerate'])->name('payouts.regenerate')->middleware('can:'.Ability::PayoutsManage->value);
    Route::post('/gaji/{payout}/kirim-hr', [PayoutController::class, 'submitToHr'])->name('payouts.submit-hr')->middleware('can:'.Ability::PayoutsManage->value);
    Route::post('/gaji/{payout}/bayar-semua', [PayoutController::class, 'markAllPaid'])->name('payouts.paid')->middleware('can:'.Ability::PayoutsPay->value);
    Route::delete('/gaji/{payout}', [PayoutController::class, 'destroy'])->name('payouts.destroy')->middleware('can:'.Ability::PayoutsManage->value);
    Route::delete('/gaji/{payout}/hapus-total', [PayoutController::class, 'forceDestroy'])->name('payouts.force-destroy')->middleware('can:'.Ability::PayoutsForceDelete->value);
    Route::patch('/slip/{slip}', [PayoutController::class, 'updateSlip'])->name('payout-slips.update')->middleware('can:'.Ability::PayoutsManage->value);
    Route::post('/slip/{slip}/bayar', [PayoutController::class, 'markSlipPaid'])->name('payout-slips.paid')->middleware('can:'.Ability::PayoutsPay->value);

    Route::get('/pembayaran-maklun', [MakloonPaymentController::class, 'index'])->name('makloon-payments.index')->middleware('can:'.Ability::MakloonPaymentsManage->value);
    Route::get('/pembayaran-maklun/baru', [MakloonPaymentController::class, 'create'])->name('makloon-payments.create')->middleware('can:'.Ability::MakloonPaymentsManage->value);
    Route::post('/pembayaran-maklun', [MakloonPaymentController::class, 'store'])->name('makloon-payments.store')->middleware('can:'.Ability::MakloonPaymentsManage->value);
    Route::get('/pembayaran-maklun/{makloonPayment}', [MakloonPaymentController::class, 'show'])->name('makloon-payments.show')->middleware('can:'.Ability::MakloonPaymentsManage->value);
    Route::delete('/pembayaran-maklun/{makloonPayment}', [MakloonPaymentController::class, 'destroy'])->name('makloon-payments.destroy')->middleware('can:'.Ability::MakloonPaymentsManage->value);

    Route::get('/riwayat', [ActivityLogController::class, 'index'])->name('activity-logs.index')->middleware('can:'.Ability::ActivityLogsView->value);
    Route::get('/riwayat/hapus-pratinjau', [ActivityLogController::class, 'purgePreview'])->name('activity-logs.purge-preview')->middleware('can:'.Ability::ActivityLogsPurge->value);
    Route::delete('/riwayat', [ActivityLogController::class, 'purge'])->name('activity-logs.purge')->middleware('can:'.Ability::ActivityLogsPurge->value);

    // Master role & ability — khusus Owner (roles.manage tidak bisa diberikan ke role lain).
    Route::get('/role', [RoleController::class, 'index'])->name('roles.index')->middleware('can:'.Ability::RolesManage->value);
    Route::post('/role', [RoleController::class, 'store'])->name('roles.store')->middleware('can:'.Ability::RolesManage->value);
    Route::patch('/role/{role}', [RoleController::class, 'update'])->name('roles.update')->middleware('can:'.Ability::RolesManage->value);
    Route::delete('/role/{role}', [RoleController::class, 'destroy'])->name('roles.destroy')->middleware('can:'.Ability::RolesManage->value);
});

require __DIR__.'/auth.php';
