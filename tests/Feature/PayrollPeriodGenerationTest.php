<?php

namespace Tests\Feature;

use App\Actions\GeneratePayrollPeriodAction;
use App\Enums\PayrollPeriodStatus;
use App\Enums\PayrollSlipStatus;
use App\Enums\TailorAssignmentStatus;
use App\Models\PayrollPeriod;
use App\Models\PayrollSlip;
use App\Models\PayrollSlipLine;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use App\Models\User;
use App\Models\WorkType;
use App\Services\DashboardDataService;
use App\Services\PayrollSlipWhatsappService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PayrollPeriodGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_official_payroll_slots(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('payroll-periods.store'), [
            'starts_at' => '2026-02-01',
            'ends_at' => '2026-02-14',
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $this->actingAs($user)->post(route('payroll-periods.store'), [
            'starts_at' => '2026-02-15',
            'ends_at' => '2026-02-28',
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $this->actingAs($user)->post(route('payroll-periods.store'), [
            'starts_at' => '2028-02-15',
            'ends_at' => '2028-02-29',
        ])->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $this->assertSame(3, PayrollPeriod::count());
    }

    public function test_payroll_period_rejects_invalid_slot_and_overlap(): void
    {
        $user = User::factory()->create();
        PayrollPeriod::create([
            'code' => 'GJ-20260601-20260614',
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-06-14',
            'status' => PayrollPeriodStatus::Draft,
        ]);

        $this->actingAs($user)->post(route('payroll-periods.store'), [
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-06-13',
        ])->assertSessionHasErrors('ends_at');

        $this->actingAs($user)->post(route('payroll-periods.store'), [
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-06-14',
        ])->assertSessionHasErrors('starts_at');
    }

    public function test_generate_groups_completions_per_tailor_and_uses_inclusive_boundaries(): void
    {
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailorA = $this->tailor('PNJ-A', 'Ayu');
        $tailorB = $this->tailor('PNJ-B', 'Bima');

        $this->completion($tailorA, completedQty: 2, rateAmount: 5000, completedAt: '2026-06-01 00:00:00');
        $this->completion($tailorA, completedQty: 3, rateAmount: 7000, completedAt: '2026-06-14 23:59:59');
        $this->completion($tailorB, completedQty: 4, rateAmount: 6000, completedAt: '2026-06-10 10:00:00');
        $this->completion($tailorB, completedQty: 9, rateAmount: 6000, completedAt: '2026-06-15 00:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);

        $period->refresh();

        $this->assertSame(2, $period->total_tailors);
        $this->assertSame(9, $period->total_completed_qty);
        $this->assertSame(55000, $period->total_amount);
        $this->assertSame(2, PayrollSlip::count());
        $this->assertSame(3, PayrollSlipLine::count());

        $slipA = PayrollSlip::where('tailor_id', $tailorA->id)->firstOrFail();
        $this->assertSame(5, $slipA->completed_qty);
        $this->assertSame(31000, $slipA->gross_amount);
        $this->assertSame(31000, $slipA->net_amount);
    }

    public function test_draft_regenerate_is_idempotent(): void
    {
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-C', 'Citra');
        $this->completion($tailor, completedQty: 2, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        app(GeneratePayrollPeriodAction::class)->execute($period->refresh());

        $this->assertSame(1, PayrollSlip::count());
        $this->assertSame(1, PayrollSlipLine::count());
        $this->assertSame(10000, $period->refresh()->total_amount);
    }

    public function test_payroll_line_freezes_snapshot_after_master_data_changes(): void
    {
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-D', 'Dina');
        $completion = $this->completion($tailor, completedQty: 2, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);

        $completion->productionArticle->update(['article_name' => 'Artikel Berubah']);
        $completion->workType->update(['name' => 'Tarif Berubah', 'rate_amount' => 99000]);

        $line = PayrollSlipLine::firstOrFail();

        $this->assertSame('Kemeja Basic', $line->article_name);
        $this->assertStringStartsWith('Jahit Reguler', $line->work_type_name);
        $this->assertSame(5000, $line->unit_rate_amount);
        $this->assertSame(10000, $line->subtotal_amount);
    }

    public function test_locked_period_cannot_regenerate_and_blocks_backdated_completion(): void
    {
        $user = User::factory()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-E', 'Eka');
        $assignment = $this->assignment($tailor, assignedQty: 10, rateAmount: 5000);
        $this->completion($tailor, completedQty: 2, rateAmount: 5000, completedAt: '2026-06-03 09:00:00', assignment: $assignment);

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $this->actingAs($user)->post(route('payroll-periods.lock', $period))->assertSessionHasNoErrors();

        $this->expectException(ValidationException::class);
        app(GeneratePayrollPeriodAction::class)->execute($period->refresh());
    }

    public function test_locked_period_rejects_completion_inside_period(): void
    {
        $user = User::factory()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $period->forceFill([
            'status' => PayrollPeriodStatus::Locked,
            'generated_at' => now(),
            'locked_at' => now(),
        ])->save();
        $tailor = $this->tailor('PNJ-F', 'Fajar');
        $assignment = $this->assignment($tailor, assignedQty: 10, rateAmount: 5000);

        $this->actingAs($user)->post(route('assignments.completions.store', $assignment), [
            'completed_qty' => 1,
            'completed_at' => '2026-06-05 10:00:00',
        ])->assertSessionHasErrors('completed_at');

        $this->assertSame(0, TailorAssignmentCompletion::count());
    }

    public function test_public_slip_route_and_whatsapp_url(): void
    {
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-G', 'Gita', '0812-3456-7890');
        $this->completion($tailor, completedQty: 2, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $slip = PayrollSlip::firstOrFail();

        $this->get(route('payroll-slips.public', [$slip->invoice_number, $slip->public_token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('PayrollSlips/Show')
                ->where('slip.invoice_number', $slip->invoice_number)
                ->where('slip.net_amount', 10000)
            );

        $this->get(route('payroll-slips.public', [$slip->invoice_number, 'bad-token']))->assertNotFound();

        $url = app(PayrollSlipWhatsappService::class)->url($slip);
        $this->assertStringStartsWith('https://wa.me/6281234567890?text=', $url);
        $this->assertStringContainsString(rawurlencode($slip->invoice_number), $url);
    }

    public function test_dashboard_slips_include_whatsapp_url_and_payment_action_flag(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-H', 'Hana', '0812-1111-2222');
        $this->completion($tailor, completedQty: 3, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $this->actingAs($user)->post(route('payroll-periods.lock', $period))->assertSessionHasNoErrors();

        $data = app(DashboardDataService::class)->data();
        $slip = $data['payrollSlips']->first();

        $this->assertSame('draft', $slip['status']);
        $this->assertTrue($slip['can_mark_paid']);
        $this->assertStringStartsWith('https://wa.me/6281211112222?text=', $slip['whatsapp_url']);
    }

    public function test_superadmin_can_mark_payroll_slip_paid_and_period_follows_when_all_paid(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-I', 'Intan', '0812-2222-3333');
        $this->completion($tailor, completedQty: 4, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $this->actingAs($user)->post(route('payroll-periods.lock', $period))->assertSessionHasNoErrors();
        $slip = PayrollSlip::firstOrFail();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->post(route('payroll-slips.paid', $slip))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $this->assertSame(PayrollSlipStatus::Paid, $slip->refresh()->status);
        $this->assertNotNull($slip->paid_at);
        $this->assertSame(PayrollPeriodStatus::Paid, $period->refresh()->status);
        $this->assertNotNull($period->paid_at);
    }

    public function test_superadmin_can_update_payroll_slip_adjustment_and_period_total(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-K', 'Kirana', '0812-4444-5555');
        $this->completion($tailor, completedQty: 4, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $slip = PayrollSlip::firstOrFail();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->patch(route('payroll-slips.adjustment.update', $slip), [
                'bonus_amount' => 3000,
                'deduction_amount' => 7000,
                'notes' => 'Kasbon warung',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $this->assertSame(3000, $slip->refresh()->bonus_amount);
        $this->assertSame(7000, $slip->deduction_amount);
        $this->assertSame(16000, $slip->net_amount);
        $this->assertSame('Kasbon warung', $slip->notes);
        $this->assertSame(16000, $period->refresh()->total_amount);
    }

    public function test_paid_payroll_slip_adjustment_is_blocked(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-L', 'Lina', '0812-5555-6666');
        $this->completion($tailor, completedQty: 4, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $slip = PayrollSlip::firstOrFail();
        $this->actingAs($user)->post(route('payroll-periods.lock', $period))->assertSessionHasNoErrors();
        $this->actingAs($user)->post(route('payroll-slips.paid', $slip))->assertSessionHasNoErrors();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->patch(route('payroll-slips.adjustment.update', $slip), [
                'bonus_amount' => 3000,
                'deduction_amount' => 7000,
            ])
            ->assertSessionHasErrors('payroll_slip_id')
            ->assertRedirect(route('dashboard'));

        $this->assertSame(0, $slip->refresh()->bonus_amount);
        $this->assertSame(0, $slip->deduction_amount);
        $this->assertSame(20000, $slip->net_amount);
    }
    public function test_superadmin_can_export_payroll_period_csv(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-M', 'Maya', '0812-6666-7777');
        $this->completion($tailor, completedQty: 4, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $slip = PayrollSlip::firstOrFail();
        $slip->forceFill([
            'bonus_amount' => 3000,
            'deduction_amount' => 1000,
            'net_amount' => 22000,
            'notes' => 'Bonus hadir',
        ])->save();
        $period->forceFill(['total_amount' => 22000])->save();

        $response = $this->actingAs($user)->get(route('payroll-periods.export', $period));

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $csv = $response->streamedContent();

        $this->assertStringContainsString('invoice_number,period_code,period_start,period_end,tailor_code,tailor_name', $csv);
        $this->assertStringContainsString($slip->invoice_number, $csv);
        $this->assertStringContainsString('PNJ-M,Maya', $csv);
        $this->assertStringContainsString('"Kemeja Basic",Hitam,M', $csv);
        $this->assertStringContainsString('20000,3000,1000,22000', $csv);
        $this->assertStringContainsString('Bonus hadir', $csv);
    }

    public function test_admin_cannot_export_payroll_period_csv(): void
    {
        $user = User::factory()->admin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');

        $this->actingAs($user)
            ->get(route('payroll-periods.export', $period))
            ->assertForbidden();
    }
    public function test_payroll_slip_cannot_be_marked_paid_before_period_is_locked(): void
    {
        $user = User::factory()->superadmin()->create();
        $period = $this->period('2026-06-01', '2026-06-14');
        $tailor = $this->tailor('PNJ-J', 'Jihan', '0812-3333-4444');
        $this->completion($tailor, completedQty: 4, rateAmount: 5000, completedAt: '2026-06-03 09:00:00');

        app(GeneratePayrollPeriodAction::class)->execute($period);
        $slip = PayrollSlip::firstOrFail();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->post(route('payroll-slips.paid', $slip))
            ->assertSessionHasErrors('payroll_slip_id')
            ->assertRedirect(route('dashboard'));

        $this->assertSame(PayrollSlipStatus::Draft, $slip->refresh()->status);
        $this->assertNull($slip->paid_at);
        $this->assertSame(PayrollPeriodStatus::Draft, $period->refresh()->status);
    }

    private function period(string $startsAt, string $endsAt): PayrollPeriod
    {
        return PayrollPeriod::create([
            'code' => 'GJ-'.str_replace('-', '', $startsAt).'-'.str_replace('-', '', $endsAt),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => PayrollPeriodStatus::Draft,
        ]);
    }

    private function tailor(string $code, string $name, ?string $whatsapp = null): Tailor
    {
        return Tailor::create([
            'code' => $code,
            'name' => $name,
            'whatsapp_number' => $whatsapp,
            'is_active' => true,
        ]);
    }

    private function workType(int $rateAmount): WorkType
    {
        return WorkType::create([
            'code' => 'WRK-'.fake()->unique()->numerify('###'),
            'name' => 'Jahit Reguler '.fake()->unique()->word(),
            'category' => 'regular',
            'unit' => 'pcs',
            'rate_amount' => $rateAmount,
            'is_active' => true,
        ]);
    }

    private function article(WorkType $workType): ProductionArticle
    {
        return ProductionArticle::create([
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Basic',
            'color' => 'Hitam',
            'size' => 'M',
            'planned_qty' => 50,
            'available_qty' => 50,
            'assigned_qty' => 0,
            'completed_qty' => 0,
            'status' => 'ready',
            'ready_at' => '2026-06-01',
        ]);
    }

    private function assignment(Tailor $tailor, int $assignedQty, int $rateAmount): TailorAssignment
    {
        $workType = $this->workType($rateAmount);
        $article = $this->article($workType);

        return TailorAssignment::create([
            'tailor_id' => $tailor->id,
            'production_article_id' => $article->id,
            'work_type_id' => $workType->id,
            'assigned_qty' => $assignedQty,
            'completed_qty' => 0,
            'unit_rate_amount' => $rateAmount,
            'status' => TailorAssignmentStatus::InProgress,
            'assigned_at' => '2026-06-01 08:00:00',
        ]);
    }

    private function completion(
        Tailor $tailor,
        int $completedQty,
        int $rateAmount,
        string $completedAt,
        ?TailorAssignment $assignment = null
    ): TailorAssignmentCompletion {
        $assignment ??= $this->assignment($tailor, assignedQty: 50, rateAmount: $rateAmount);

        return TailorAssignmentCompletion::create([
            'tailor_assignment_id' => $assignment->id,
            'tailor_id' => $tailor->id,
            'production_article_id' => $assignment->production_article_id,
            'work_type_id' => $assignment->work_type_id,
            'completed_qty' => $completedQty,
            'defect_qty' => 0,
            'revision_qty' => 0,
            'unit_rate_amount' => $rateAmount,
            'subtotal_amount' => $completedQty * $rateAmount,
            'completed_at' => $completedAt,
        ]);
    }
}






