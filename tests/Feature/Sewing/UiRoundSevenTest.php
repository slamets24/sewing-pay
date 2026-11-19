<?php

namespace Tests\Feature\Sewing;

use App\Enums\TailorType;
use App\Models\TailorAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UiRoundSevenTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_quiet_attendance_save_skips_status_flash(): void
    {
        $tailor = $this->tailor();

        $this->actingAs($this->warehouseAdmin())
            ->post(route('attendances.store'), [
                'tailor_id' => $tailor->id,
                'date' => today()->toDateString(),
                'status' => 'present',
                'working_hours' => 9,
                'quiet' => true,
            ])
            ->assertRedirect()
            ->assertSessionMissing('status');

        $this->assertSame(1, TailorAttendance::query()->where('tailor_id', $tailor->id)->count());
    }

    public function test_tailor_page_offers_separate_makloon_code(): void
    {
        $this->tailor(TailorType::Makloon, 'Konveksi Maju');

        $this->actingAs($this->owner())
            ->get(route('tailors.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('nextMakloonCode', fn ($code) => str_starts_with((string) $code, 'MKL-'))
                ->where('nextCode', fn ($code) => str_starts_with((string) $code, 'PNJ-')));
    }

    public function test_owner_can_create_makloon_with_makloon_message(): void
    {
        $this->actingAs($this->owner())
            ->post(route('tailors.store'), [
                'code' => 'MKL-001',
                'name' => 'Konveksi Berkah',
                'type' => 'makloon',
                'is_active' => true,
            ])
            ->assertRedirect()
            ->assertSessionHas('status', fn ($status) => str_contains($status, 'Makloon'));

        $this->assertDatabaseHas('tailors', ['code' => 'MKL-001', 'type' => 'makloon']);
    }

    public function test_error_flash_is_shared_with_inertia(): void
    {
        $this->actingAs($this->owner())
            ->withSession(['error' => 'Gagal sinkron'])
            ->get(route('tailors.index'))
            ->assertInertia(fn ($page) => $page->where('flash.error', 'Gagal sinkron'));
    }
}
