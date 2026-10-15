<?php

namespace Tests\Feature;

use App\Enums\PayrollPeriodStatus;
use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\PayrollPeriod;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use App\Models\User;
use App\Models\WorkType;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuickInputFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_completion_flashes_an_undo_link_for_the_new_entry(): void
    {
        $user = User::factory()->admin()->create();
        $assignment = $this->assignment(assignedQty: 10);

        $this->actingAs($user)
            ->from(route('admin.mobile'))
            ->post(route('assignments.completions.store', $assignment), ['completed_qty' => 5])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('admin.mobile'))
            ->assertSessionHas('undo', [
                'url' => route('completions.destroy', TailorAssignmentCompletion::firstOrFail()),
                'method' => 'delete',
            ]);
    }

    public function test_undo_completion_rolls_qty_back_out_of_assignment_and_article(): void
    {
        $user = User::factory()->admin()->create();
        $assignment = $this->assignment(assignedQty: 10);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 4]);
        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 6]);

        $this->assertSame(TailorAssignmentStatus::Completed, $assignment->refresh()->status);
        $this->assertSame(ProductionArticleStatus::Completed, $assignment->productionArticle->refresh()->status);

        $lastCompletion = TailorAssignmentCompletion::query()->where('completed_qty', 6)->firstOrFail();

        $this->actingAs($user)
            ->delete(route('completions.destroy', $lastCompletion))
            ->assertSessionHasNoErrors();

        $assignment->refresh();
        $article = $assignment->productionArticle->refresh();

        $this->assertModelMissing($lastCompletion);
        $this->assertSame(4, $assignment->completed_qty);
        $this->assertSame(TailorAssignmentStatus::Partial, $assignment->status);
        $this->assertSame(4, $article->completed_qty);
        $this->assertSame(ProductionArticleStatus::InProgress, $article->status);

        $this->actingAs($user)
            ->delete(route('completions.destroy', TailorAssignmentCompletion::firstOrFail()))
            ->assertSessionHasNoErrors();

        $this->assertSame(0, $assignment->refresh()->completed_qty);
        $this->assertSame(TailorAssignmentStatus::InProgress, $assignment->status);
    }

    public function test_undo_is_blocked_once_the_completion_is_on_a_payroll_slip(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-20 10:00:00'));

        $superadmin = User::factory()->superadmin()->create();
        $assignment = $this->assignment(assignedQty: 10);

        $this->actingAs($superadmin)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 3]);

        $period = PayrollPeriod::create([
            'code' => 'GJ-20261015-20261031',
            'starts_at' => '2026-10-15',
            'ends_at' => '2026-10-31',
            'status' => PayrollPeriodStatus::Draft,
        ]);
        $this->actingAs($superadmin)->post(route('payroll-periods.generate', $period))->assertSessionHasNoErrors();

        $completion = TailorAssignmentCompletion::firstOrFail();

        $this->actingAs($superadmin)
            ->delete(route('completions.destroy', $completion))
            ->assertSessionHasErrors('completion');

        $this->assertModelExists($completion);
        $this->assertSame(3, $assignment->refresh()->completed_qty);
    }

    public function test_admin_can_only_undo_their_own_completion(): void
    {
        $author = User::factory()->admin()->create();
        $otherAdmin = User::factory()->admin()->create();
        $superadmin = User::factory()->superadmin()->create();
        $assignment = $this->assignment(assignedQty: 10);

        $this->actingAs($author)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 2]);
        $completion = TailorAssignmentCompletion::firstOrFail();

        $this->actingAs($otherAdmin)->delete(route('completions.destroy', $completion))->assertForbidden();
        $this->assertModelExists($completion);

        $this->actingAs($superadmin)->delete(route('completions.destroy', $completion))->assertSessionHasNoErrors();
        $this->assertModelMissing($completion);
    }

    public function test_assignment_flashes_undo_and_cancel_returns_qty_to_the_article(): void
    {
        $user = User::factory()->admin()->create();
        $tailor = $this->tailor();
        $article = $this->article($this->workType(), plannedQty: 20);

        $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $article->id,
            'assigned_qty' => 8,
        ])->assertSessionHas('undo.method', 'post');

        $assignment = TailorAssignment::firstOrFail();
        $this->assertSame(12, $article->refresh()->available_qty);

        $this->actingAs($user)
            ->post(route('assignments.cancel', $assignment))
            ->assertSessionHasNoErrors();

        $assignment->refresh();
        $article->refresh();

        $this->assertSame(TailorAssignmentStatus::Cancelled, $assignment->status);
        $this->assertSame($user->id, $assignment->cancelled_by);
        $this->assertNotNull($assignment->cancelled_at);
        $this->assertSame(20, $article->available_qty);
        $this->assertSame(0, $article->assigned_qty);
        $this->assertSame(ProductionArticleStatus::Ready, $article->status);
    }

    public function test_assignment_with_completed_qty_cannot_be_cancelled(): void
    {
        $user = User::factory()->superadmin()->create();
        $assignment = $this->assignment(assignedQty: 10);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 1]);

        $this->actingAs($user)->post(route('assignments.cancel', $assignment))->assertForbidden();
        $this->assertSame(TailorAssignmentStatus::Partial, $assignment->refresh()->status);
    }

    public function test_batch_hancaan_creates_one_ready_article_per_variant(): void
    {
        $user = User::factory()->admin()->create();
        $workType = $this->workType(rateAmount: 6000);

        $this->actingAs($user)
            ->from(route('admin.mobile'))
            ->post(route('hancaan.batch'), [
                'work_type_id' => $workType->id,
                'article_name' => 'Kemeja Oxford',
                'variants' => [
                    ['color' => 'Navy', 'size' => 'M', 'planned_qty' => 20],
                    ['color' => 'Navy', 'size' => 'L', 'planned_qty' => 40],
                    ['color' => 'Putih', 'size' => 'L', 'planned_qty' => 30],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('admin.mobile'))
            ->assertSessionHas('status', '3 hancaan (90 pcs) siap diambil.');

        $this->assertSame(3, ProductionArticle::count());
        $this->assertDatabaseHas('production_articles', [
            'article_name' => 'Kemeja Oxford',
            'color' => 'Navy',
            'size' => 'L',
            'planned_qty' => 40,
            'available_qty' => 40,
            'created_by' => $user->id,
            'status' => ProductionArticleStatus::Ready->value,
        ]);
    }

    public function test_batch_hancaan_rejects_duplicate_or_empty_variants(): void
    {
        $user = User::factory()->admin()->create();
        $workType = $this->workType();

        $this->actingAs($user)->post(route('hancaan.batch'), [
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Oxford',
            'variants' => [
                ['color' => 'Navy', 'size' => 'L', 'planned_qty' => 5],
                ['color' => 'navy', 'size' => 'L', 'planned_qty' => 7],
            ],
        ])->assertSessionHasErrors('variants');

        $this->actingAs($user)->post(route('hancaan.batch'), [
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Oxford',
            'variants' => [],
        ])->assertSessionHasErrors('variants');

        $this->assertSame(0, ProductionArticle::count());
    }

    public function test_mobile_page_exposes_current_period_progress_and_form_suggestions(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-20 10:00:00'));

        $user = User::factory()->admin()->create();
        $assignment = $this->assignment(assignedQty: 10, rateAmount: 6500);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), ['completed_qty' => 3]);

        $this->actingAs($user)->get(route('admin.mobile'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('AdminMobile/Index')
                ->where('currentPeriod.starts_at', '2026-10-15')
                ->where('currentPeriod.ends_at', '2026-10-31')
                ->where('currentPeriod.days_left', 11)
                ->where('currentPeriod.status', null)
                ->where('currentPeriod.wage_amount', 19500)
                ->where('currentPeriod.tailors.0.tailor_id', $assignment->tailor_id)
                ->where('currentPeriod.tailors.0.wage_amount', 19500)
                ->where('activeAssignments.0.tailor_id', $assignment->tailor_id)
                ->where('activeAssignments.0.can_cancel', false)
                ->where('recentCompletions.0.can_undo', true)
                ->where('hancaanSuggestions.articles.0.name', 'Kemeja Basic')
                ->where('hancaanSuggestions.colors.0', 'Hitam')
                ->where('hancaanSuggestions.sizes.0', 'M')
            );
    }

    private function tailor(): Tailor
    {
        return Tailor::create([
            'code' => 'PNJ-'.fake()->unique()->numerify('###'),
            'name' => fake()->name(),
            'is_active' => true,
        ]);
    }

    private function workType(int $rateAmount = 5000): WorkType
    {
        return WorkType::create([
            'code' => 'WRK-'.fake()->unique()->numerify('###'),
            'name' => 'Jahit '.fake()->unique()->word(),
            'category' => 'regular',
            'unit' => 'pcs',
            'rate_amount' => $rateAmount,
            'is_active' => true,
        ]);
    }

    private function article(WorkType $workType, int $plannedQty = 10): ProductionArticle
    {
        return ProductionArticle::create([
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Basic',
            'color' => 'Hitam',
            'size' => 'M',
            'planned_qty' => $plannedQty,
            'available_qty' => $plannedQty,
            'assigned_qty' => 0,
            'completed_qty' => 0,
            'status' => ProductionArticleStatus::Ready,
            'ready_at' => today(),
        ]);
    }

    private function assignment(int $assignedQty = 10, int $rateAmount = 5000): TailorAssignment
    {
        $workType = $this->workType(rateAmount: $rateAmount);
        $article = $this->article($workType, plannedQty: $assignedQty);

        $article->forceFill([
            'available_qty' => 0,
            'assigned_qty' => $assignedQty,
            'status' => ProductionArticleStatus::InProgress,
        ])->save();

        return TailorAssignment::create([
            'tailor_id' => $this->tailor()->id,
            'production_article_id' => $article->id,
            'work_type_id' => $workType->id,
            'assigned_qty' => $assignedQty,
            'completed_qty' => 0,
            'unit_rate_amount' => $rateAmount,
            'status' => TailorAssignmentStatus::InProgress,
            'assigned_at' => now(),
        ]);
    }
}
