<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Enums\WorkTypeCategory;
use App\Http\Controllers\Controller;
use App\Services\DashboardDataService;
use Inertia\Inertia;
use Inertia\Response;

class AdminMobileController extends Controller
{
    public function __invoke(DashboardDataService $dashboardData): Response
    {
        return Inertia::render('AdminMobile/Index', [
            ...$dashboardData->data(),
            'workTypeCategories' => collect(WorkTypeCategory::cases())->map(fn (WorkTypeCategory $category) => [
                'value' => $category->value,
                'label' => $category->label(),
            ]),
        ]);
    }
}