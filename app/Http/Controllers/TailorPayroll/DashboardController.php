<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Enums\UserRole;
use App\Enums\WorkTypeCategory;
use App\Http\Controllers\Controller;
use App\Services\DashboardDataService;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(DashboardDataService $dashboardData): Response
    {
        return Inertia::render('Dashboard', [
            ...$dashboardData->data(),
            'workTypeCategories' => collect(WorkTypeCategory::cases())->map(fn (WorkTypeCategory $category) => [
                'value' => $category->value,
                'label' => $category->label(),
            ]),
            'userRoles' => collect(UserRole::cases())->map(fn (UserRole $role) => [
                'value' => $role->value,
                'label' => $role->label(),
            ]),
        ]);
    }
}