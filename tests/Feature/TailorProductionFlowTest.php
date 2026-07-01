<?php

namespace Tests\Feature;

use App\Enums\ProductionArticleStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TailorProductionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_hancaan(): void
    {
        $user = User::factory()->create();
        $workType = $this->workType(rateAmount: 7500);

        $response = $this->actingAs($user)->post(route('hancaan.store'), [
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Oxford',
            'color' => 'Navy',
            'size' => 'L',
            'planned_qty' => 24,
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $this->assertDatabaseHas('production_articles', [
            'article_name' => 'Kemeja Oxford',
            'color' => 'Navy',
            'size' => 'L',
            'planned_qty' => 24,
            'available_qty' => 24,
            'status' => ProductionArticleStatus::Ready->value,
        ]);
    }

    public function test_assignment_decrements_available_qty_and_snapshots_rate(): void
    {
        $user = User::factory()->create();
        $tailor = $this->tailor();
        $workType = $this->workType(rateAmount: 6000);
        $article = $this->article($workType, plannedQty: 20);

        $response = $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $article->id,
            'assigned_qty' => 8,
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $assignment = TailorAssignment::firstOrFail();

        $this->assertSame(8, $assignment->assigned_qty);
        $this->assertSame(6000, $assignment->unit_rate_amount);
        $this->assertSame(TailorAssignmentStatus::InProgress, $assignment->status);
        $this->assertSame(12, $article->refresh()->available_qty);
        $this->assertSame(8, $article->assigned_qty);
    }

    public function test_assignment_cannot_exceed_available_qty(): void
    {
        $user = User::factory()->create();
        $tailor = $this->tailor();
        $workType = $this->workType();
        $article = $this->article($workType, plannedQty: 5);

        $response = $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $article->id,
            'assigned_qty' => 6,
        ]);

        $response->assertSessionHasErrors('assigned_qty');
        $this->assertSame(5, $article->refresh()->available_qty);
        $this->assertSame(0, TailorAssignment::count());
    }

    public function test_same_tailor_can_have_multiple_active_hancaan(): void
    {
        $user = User::factory()->create();
        $tailor = $this->tailor();
        $workType = $this->workType();
        $firstArticle = $this->article($workType, articleName: 'Celana Cargo', plannedQty: 10);
        $secondArticle = $this->article($workType, articleName: 'Jaket Twill', plannedQty: 10);

        $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $firstArticle->id,
            'assigned_qty' => 3,
        ])->assertSessionHasNoErrors();

        $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $secondArticle->id,
            'assigned_qty' => 4,
        ])->assertSessionHasNoErrors();

        $this->assertSame(2, TailorAssignment::where('tailor_id', $tailor->id)->count());
        $this->assertSame(2, TailorAssignment::where('status', TailorAssignmentStatus::InProgress)->count());
    }

    public function test_partial_completion_preserves_history_and_updates_status(): void
    {
        $user = User::factory()->create();
        $assignment = $this->assignment(assignedQty: 10, rateAmount: 7000);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 4,
        ])->assertSessionHasNoErrors();

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 3,
        ])->assertSessionHasNoErrors();

        $assignment->refresh();

        $this->assertSame(2, TailorAssignmentCompletion::where('tailor_assignment_id', $assignment->id)->count());
        $this->assertSame(7, $assignment->completed_qty);
        $this->assertSame(3, $assignment->remainingQty());
        $this->assertSame(TailorAssignmentStatus::Partial, $assignment->status);
        $this->assertDatabaseHas('tailor_assignment_completions', [
            'tailor_assignment_id' => $assignment->id,
            'completed_qty' => 4,
            'unit_rate_amount' => 7000,
            'subtotal_amount' => 28000,
        ]);
    }

    public function test_completion_cannot_exceed_remaining_qty(): void
    {
        $user = User::factory()->create();
        $assignment = $this->assignment(assignedQty: 5);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 4,
        ])->assertSessionHasNoErrors();

        $response = $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 2,
        ]);

        $response->assertSessionHasErrors('completed_qty');
        $this->assertSame(4, $assignment->refresh()->completed_qty);
        $this->assertSame(1, TailorAssignmentCompletion::where('tailor_assignment_id', $assignment->id)->count());
    }

    public function test_full_completion_marks_assignment_completed(): void
    {
        $user = User::factory()->create();
        $assignment = $this->assignment(assignedQty: 5);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 5,
        ])->assertSessionHasNoErrors();

        $assignment->refresh();

        $this->assertSame(5, $assignment->completed_qty);
        $this->assertSame(TailorAssignmentStatus::Completed, $assignment->status);
    }

    public function test_rate_snapshot_is_stable_after_master_tariff_change(): void
    {
        $user = User::factory()->create();
        $tailor = $this->tailor();
        $workType = $this->workType(rateAmount: 5000);
        $article = $this->article($workType, plannedQty: 10);

        $this->actingAs($user)->post(route('assignments.store'), [
            'tailor_id' => $tailor->id,
            'production_article_id' => $article->id,
            'assigned_qty' => 10,
        ])->assertSessionHasNoErrors();

        $assignment = TailorAssignment::firstOrFail();
        $workType->update(['rate_amount' => 9000]);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 2,
        ])->assertSessionHasNoErrors();

        $completion = TailorAssignmentCompletion::firstOrFail();

        $this->assertSame(5000, $assignment->refresh()->unit_rate_amount);
        $this->assertSame(5000, $completion->unit_rate_amount);
        $this->assertSame(10000, $completion->subtotal_amount);
    }

    public function test_dashboard_shows_active_work_and_running_wage(): void
    {
        $user = User::factory()->create();
        $assignment = $this->assignment(assignedQty: 8, rateAmount: 6500);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 3,
        ])->assertSessionHasNoErrors();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('stats.assignments_active', 1)
                ->where('stats.completed_today_qty', 3)
                ->where('stats.running_wage_estimate', 19500)
                ->where('activeAssignments.0.remaining_qty', 5)
            );
    }

    public function test_mobile_admin_page_shows_operational_data(): void
    {
        $user = User::factory()->create();
        $assignment = $this->assignment(assignedQty: 8, rateAmount: 6500);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 3,
        ])->assertSessionHasNoErrors();

        $response = $this->actingAs($user)->get(route('admin.mobile'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('AdminMobile/Index')
                ->where('stats.assignments_active', 1)
                ->where('stats.completed_today_qty', 3)
                ->where('activeAssignments.0.remaining_qty', 5)
            );
    }

    public function test_mobile_assignment_redirects_back_to_mobile_admin(): void
    {
        $user = User::factory()->create();
        $tailor = $this->tailor();
        $workType = $this->workType(rateAmount: 6000);
        $article = $this->article($workType, plannedQty: 20);

        $response = $this
            ->actingAs($user)
            ->from(route('admin.mobile'))
            ->post(route('assignments.store'), [
                'tailor_id' => $tailor->id,
                'production_article_id' => $article->id,
                'assigned_qty' => 8,
            ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('admin.mobile'));
        $this->assertSame(12, $article->refresh()->available_qty);
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

    private function article(WorkType $workType, string $articleName = 'Kemeja Basic', int $plannedQty = 10): ProductionArticle
    {
        return ProductionArticle::create([
            'work_type_id' => $workType->id,
            'article_name' => $articleName,
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
        $tailor = $this->tailor();
        $workType = $this->workType(rateAmount: $rateAmount);
        $article = $this->article($workType, plannedQty: $assignedQty);

        return TailorAssignment::create([
            'tailor_id' => $tailor->id,
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
