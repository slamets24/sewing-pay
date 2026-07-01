<?php

namespace App\Services;

use App\Enums\PayrollPeriodStatus;
use App\Enums\PayrollSlipStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\PayrollPeriod;
use App\Models\PayrollSlip;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\User;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use App\Models\WorkType;
use Illuminate\Support\Carbon;

class DashboardDataService
{
    /**
     * @return array<string, mixed>
     */
    public function data(): array
    {
        $activeStatuses = [
            TailorAssignmentStatus::InProgress->value,
            TailorAssignmentStatus::Partial->value,
            TailorAssignmentStatus::Revision->value,
        ];

        $activeAssignments = TailorAssignment::query()
            ->with(['tailor', 'productionArticle', 'workType'])
            ->whereIn('status', $activeStatuses)
            ->latest('assigned_at')
            ->get();

        $today = Carbon::today();

        $whatsappService = app(PayrollSlipWhatsappService::class);

        return [
            'stats' => [
                'tailors_active' => Tailor::query()->where('is_active', true)->count(),
                'hancaan_total' => ProductionArticle::query()->count(),
                'assignments_active' => $activeAssignments->count(),
                'completed_today_qty' => TailorAssignmentCompletion::query()
                    ->whereDate('completed_at', $today)
                    ->sum('completed_qty'),
                'running_wage_estimate' => TailorAssignmentCompletion::query()->sum('subtotal_amount'),
            ],
            'tailors' => Tailor::query()
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'whatsapp_number', 'address', 'joined_at', 'notes', 'is_active']),
            'users' => User::query()
                ->latest('id')
                ->limit(12)
                ->get(['id', 'name', 'email', 'role', 'created_at'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'role_label' => $user->role->label(),
                    'is_current_user' => $user->is(auth()->user()),
                    'created_at' => $user->created_at?->format('Y-m-d H:i'),
                ]),
            'workTypes' => WorkType::query()
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'category', 'unit', 'rate_amount', 'notes', 'is_active']),
            'availableArticles' => ProductionArticle::query()
                ->with('workType:id,name,rate_amount')
                ->where('available_qty', '>', 0)
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (ProductionArticle $article) => $this->articlePayload($article)),
            'activeAssignments' => $activeAssignments
                ->map(fn (TailorAssignment $assignment) => $this->assignmentPayload($assignment)),
            'recentCompletions' => TailorAssignmentCompletion::query()
                ->with(['tailor', 'productionArticle', 'workType'])
                ->latest('completed_at')
                ->limit(10)
                ->get()
                ->map(fn (TailorAssignmentCompletion $completion) => [
                    'id' => $completion->id,
                    'tailor_name' => $completion->tailor->name,
                    'article_name' => $completion->productionArticle->article_name,
                    'color' => $completion->productionArticle->color,
                    'size' => $completion->productionArticle->size,
                    'work_type_name' => $completion->workType->name,
                    'completed_qty' => $completion->completed_qty,
                    'unit_rate_amount' => $completion->unit_rate_amount,
                    'subtotal_amount' => $completion->subtotal_amount,
                    'completed_at' => $completion->completed_at?->format('Y-m-d H:i'),
                ]),
            'payrollPeriods' => PayrollPeriod::query()
                ->withCount('slips')
                ->latest('starts_at')
                ->limit(6)
                ->get()
                ->map(fn (PayrollPeriod $period) => [
                    'id' => $period->id,
                    'code' => $period->code,
                    'starts_at' => $period->starts_at->format('Y-m-d'),
                    'ends_at' => $period->ends_at->format('Y-m-d'),
                    'status' => $period->status->value,
                    'status_label' => $period->status->label(),
                    'total_tailors' => $period->total_tailors,
                    'total_completed_qty' => $period->total_completed_qty,
                    'total_amount' => $period->total_amount,
                    'slips_count' => $period->slips_count,
                    'generated_at' => $period->generated_at?->format('Y-m-d H:i'),
                ]),
            'payrollSlips' => PayrollSlip::query()
                ->with(['period', 'tailor'])
                ->latest('generated_at')
                ->limit(10)
                ->get()
                ->map(fn (PayrollSlip $slip) => [
                    'id' => $slip->id,
                    'tailor_name' => $slip->tailor->name,
                    'period_code' => $slip->period->code,
                    'completed_qty' => $slip->completed_qty,
                    'gross_amount' => $slip->gross_amount,
                    'bonus_amount' => $slip->bonus_amount,
                    'deduction_amount' => $slip->deduction_amount,
                    'net_amount' => $slip->net_amount,
                    'status' => $slip->status->value,
                    'status_label' => $slip->status->label(),
                    'period_status' => $slip->period->status->value,
                    'whatsapp_url' => $whatsappService->url($slip),
                    'public_url' => route('payroll-slips.public', [$slip->invoice_number, $slip->public_token]),
                    'notes' => $slip->notes,
                    'can_update_adjustment' => $slip->status !== PayrollSlipStatus::Paid,
                    'can_mark_paid' => $slip->status !== PayrollSlipStatus::Paid
                        && $slip->period->status !== PayrollPeriodStatus::Draft,
                    'sent_at' => $slip->sent_at?->format('Y-m-d H:i'),
                    'paid_at' => $slip->paid_at?->format('Y-m-d H:i'),
                ]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function articlePayload(ProductionArticle $article): array
    {
        return [
            'id' => $article->id,
            'work_type_id' => $article->work_type_id,
            'article_name' => $article->article_name,
            'color' => $article->color,
            'size' => $article->size,
            'planned_qty' => $article->planned_qty,
            'available_qty' => $article->available_qty,
            'assigned_qty' => $article->assigned_qty,
            'completed_qty' => $article->completed_qty,
            'status' => $article->status->value,
            'status_label' => $article->status->label(),
            'work_type_name' => $article->workType->name,
            'rate_amount' => $article->workType->rate_amount,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assignmentPayload(TailorAssignment $assignment): array
    {
        return [
            'id' => $assignment->id,
            'tailor_name' => $assignment->tailor->name,
            'article_name' => $assignment->productionArticle->article_name,
            'color' => $assignment->productionArticle->color,
            'size' => $assignment->productionArticle->size,
            'work_type_name' => $assignment->workType->name,
            'assigned_qty' => $assignment->assigned_qty,
            'completed_qty' => $assignment->completed_qty,
            'remaining_qty' => $assignment->remainingQty(),
            'unit_rate_amount' => $assignment->unit_rate_amount,
            'running_subtotal' => $assignment->runningSubtotal(),
            'status' => $assignment->status->value,
            'status_label' => $assignment->status->label(),
            'assigned_at' => $assignment->assigned_at?->format('Y-m-d H:i'),
            'age_days' => $assignment->assigned_at?->diffInDays(now()),
            'notes' => $assignment->notes,
        ];
    }
}













