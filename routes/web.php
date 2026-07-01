<?php

use App\Enums\UserRole;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TailorPayroll\AdminMobileController;
use App\Http\Controllers\TailorPayroll\DashboardController;
use App\Http\Controllers\TailorPayroll\ManagedUserController;
use App\Http\Controllers\TailorPayroll\PayrollPeriodController;
use App\Http\Controllers\TailorPayroll\PayrollSlipController;
use App\Http\Controllers\TailorPayroll\ProductionArticleController;
use App\Http\Controllers\TailorPayroll\PublicPayrollSlipController;
use App\Http\Controllers\TailorPayroll\TailorAssignmentCompletionController;
use App\Http\Controllers\TailorPayroll\TailorAssignmentController;
use App\Http\Controllers\TailorPayroll\TailorController;
use App\Http\Controllers\TailorPayroll\WorkTypeController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/slip-gaji/{invoiceNumber}/{token}', PublicPayrollSlipController::class)
    ->name('payroll-slips.public');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware('role:'.UserRole::Superadmin->value)->group(function () {
        Route::get('/dashboard', DashboardController::class)->name('dashboard');

        Route::post('/tailors', [TailorController::class, 'store'])->name('tailors.store');
        Route::patch('/tailors/{tailor}', [TailorController::class, 'update'])->name('tailors.update');
        Route::post('/tailors/{tailor}/deactivate', [TailorController::class, 'deactivate'])->name('tailors.deactivate');
        Route::post('/tailors/{tailor}/activate', [TailorController::class, 'activate'])->name('tailors.activate');
        Route::post('/work-types', [WorkTypeController::class, 'store'])->name('work-types.store');
        Route::patch('/work-types/{workType}', [WorkTypeController::class, 'update'])->name('work-types.update');
        Route::post('/work-types/{workType}/deactivate', [WorkTypeController::class, 'deactivate'])->name('work-types.deactivate');
        Route::post('/work-types/{workType}/activate', [WorkTypeController::class, 'activate'])->name('work-types.activate');
        Route::post('/users', [ManagedUserController::class, 'store'])->name('users.store');
        Route::patch('/users/{user}/role', [ManagedUserController::class, 'updateRole'])->name('users.role.update');
        Route::patch('/users/{user}/password', [ManagedUserController::class, 'resetPassword'])->name('users.password.update');

        Route::patch('/hancaan/{article}', [ProductionArticleController::class, 'update'])->name('hancaan.update');
        Route::post('/hancaan/{article}/cancel', [ProductionArticleController::class, 'cancel'])->name('hancaan.cancel');
        Route::post('/payroll-periods', [PayrollPeriodController::class, 'store'])->name('payroll-periods.store');
        Route::post('/payroll-periods/{period}/generate', [PayrollPeriodController::class, 'generate'])->name('payroll-periods.generate');
        Route::post('/payroll-periods/{period}/lock', [PayrollPeriodController::class, 'lock'])->name('payroll-periods.lock');
        Route::get('/payroll-periods/{period}/export', [PayrollPeriodController::class, 'export'])->name('payroll-periods.export');
        Route::patch('/payroll-slips/{slip}/adjustment', [PayrollSlipController::class, 'updateAdjustment'])->name('payroll-slips.adjustment.update');
        Route::post('/payroll-slips/{slip}/paid', [PayrollSlipController::class, 'markPaid'])->name('payroll-slips.paid');
    });

    Route::middleware('role:'.UserRole::Superadmin->value.','.UserRole::Admin->value)->group(function () {
        Route::get('/admin-mobile', AdminMobileController::class)->name('admin.mobile');
        Route::post('/hancaan', [ProductionArticleController::class, 'store'])->name('hancaan.store');
        Route::post('/assignments', [TailorAssignmentController::class, 'store'])->name('assignments.store');
        Route::post('/assignments/{assignment}/completions', [TailorAssignmentCompletionController::class, 'store'])
            ->name('assignments.completions.store');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';




