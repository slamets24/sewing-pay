<?php

namespace Tests\Feature\Sewing;

use App\Models\Tailor;
use App\Models\TailorAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TailorAttendanceTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_admin_and_superadmin_can_view_attendance_sheet(): void
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor(name: 'Bu Siti');

        $this->actingAs($admin)
            ->get(route('attendances.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Attendance/Index')
                ->has('rows', 1)
                ->where('rows.0.tailor_name', 'Bu Siti')
                ->has('mealAllowanceRules'));
    }

    public function test_admin_can_store_and_update_tailor_attendance(): void
    {
        $admin = $this->warehouseAdmin();
        $tailor = $this->tailor(name: 'Bu Siti');
        $today = today()->toDateString();

        $this->actingAs($admin)
            ->post(route('attendances.store'), [
                'tailor_id' => $tailor->id,
                'date' => $today,
                'status' => 'present',
                'clock_in' => '08:00',
                'clock_out' => '17:00',
                'working_hours' => 9,
                'note' => 'Hadir tepat waktu',
            ])
            ->assertRedirect()
            ->assertSessionHas('status');

        $attendance = TailorAttendance::query()->where('tailor_id', $tailor->id)->first();
        $this->assertNotNull($attendance);
        $this->assertSame(9, $attendance->working_hours);
        $this->assertSame(30_000, $attendance->meal_allowance);
        $this->assertSame('present', $attendance->status);
        $this->assertSame('Hadir tepat waktu', $attendance->note);

        // Update to 10 hours -> increases to 35.000
        $this->actingAs($admin)
            ->post(route('attendances.store'), [
                'tailor_id' => $tailor->id,
                'date' => $today,
                'status' => 'present',
                'clock_in' => '08:00',
                'clock_out' => '18:00',
                'working_hours' => 10,
                'note' => 'Lembur 1 jam',
            ])
            ->assertRedirect();

        $attendance->refresh();
        $this->assertSame(10, $attendance->working_hours);
        $this->assertSame(35_000, $attendance->meal_allowance);
    }

    public function test_admin_can_batch_mark_all_internal_tailors_present(): void
    {
        $admin = $this->warehouseAdmin();
        $t1 = $this->tailor(name: 'Bu Siti');
        $t2 = $this->tailor(name: 'Pak Darto');
        $today = today()->toDateString();

        $this->actingAs($admin)
            ->post(route('attendances.batch'), [
                'date' => $today,
                'working_hours' => 9,
            ])
            ->assertRedirect();

        $this->assertSame(2, TailorAttendance::query()->whereDate('date', $today)->where('status', 'present')->count());
        $this->assertSame(30_000, TailorAttendance::query()->where('tailor_id', $t1->id)->value('meal_allowance'));
    }

    public function test_tailor_can_clock_in_and_clock_out_from_portal(): void
    {
        $tailor = $this->tailor(name: 'Bu Siti');
        $tailor->generatePortal();
        $tailor->changePortalPin('654321');

        // Unlock portal session
        $this->post(route('portal.pin.store', ['tailor' => $tailor->portal_token]), ['pin' => '654321'])
            ->assertRedirect(route('portal.show', ['tailor' => $tailor->portal_token]));

        // First click: Clock In
        $this->post(route('portal.clock.store', ['tailor' => $tailor->portal_token]))
            ->assertRedirect()
            ->assertSessionHas('status');

        $attendance = TailorAttendance::query()->where('tailor_id', $tailor->id)->first();
        $this->assertNotNull($attendance);
        $this->assertNotNull($attendance->clock_in);
        $this->assertNull($attendance->clock_out);
        $this->assertTrue($attendance->is_self_clocked);
        $this->assertSame(30_000, $attendance->meal_allowance);

        // Second click: Clock Out
        $this->post(route('portal.clock.store', ['tailor' => $tailor->portal_token]))
            ->assertRedirect()
            ->assertSessionHas('status');

        $attendance->refresh();
        $this->assertNotNull($attendance->clock_out);
        $this->assertGreaterThanOrEqual(9, $attendance->working_hours);
    }
}
