<?php

namespace Tests\Feature;

use App\Enums\PayrollPeriodStatus;
use App\Models\PayrollPeriod;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_mobile_and_operational_inputs_only(): void
    {
        $admin = User::factory()->admin()->create();
        $workType = WorkType::create([
            'code' => 'REG-ROLE',
            'name' => 'Jahit Role Test',
            'category' => 'regular',
            'unit' => 'pcs',
            'rate_amount' => 5000,
            'is_active' => true,
        ]);

        $this->actingAs($admin)->get(route('admin.mobile'))->assertOk();

        $this->actingAs($admin)->post(route('hancaan.store'), [
            'work_type_id' => $workType->id,
            'article_name' => 'Kemeja Admin',
            'planned_qty' => 5,
        ])->assertSessionHasNoErrors();

        $this->actingAs($admin)->get(route('dashboard'))->assertForbidden();
        $this->actingAs($admin)->post(route('tailors.store'), [
            'code' => 'PNJ-X',
            'name' => 'Penjahit X',
        ])->assertForbidden();
        $this->actingAs($admin)->post(route('payroll-periods.store'), [
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-06-14',
        ])->assertForbidden();
    }

    public function test_superadmin_can_access_dashboard_mobile_and_payroll_controls(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $period = PayrollPeriod::create([
            'code' => 'GJ-20260601-20260614',
            'starts_at' => '2026-06-01',
            'ends_at' => '2026-06-14',
            'status' => PayrollPeriodStatus::Draft,
        ]);

        $this->actingAs($superadmin)->get(route('dashboard'))->assertOk();
        $this->actingAs($superadmin)->get(route('admin.mobile'))->assertOk();
        $this->actingAs($superadmin)->post(route('payroll-periods.generate', $period))->assertSessionHasNoErrors();
    }
}