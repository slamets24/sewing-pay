<?php

namespace Tests\Feature\Sewing;

use App\Models\Tailor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncHrTailorsTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_trigger_hr_sync(): void
    {
        $superadmin = User::factory()->superadmin()->create();

        Http::fake([
            '*/api/v1/internal/employees*' => Http::response([
                'success' => true,
                'data' => [
                    [
                        'id' => 109,
                        'employee_number' => 'AZZ0109',
                        'name' => 'Siti Nurhaliza',
                        'gender' => 'female',
                        'phone' => '0812999888',
                        'joined_at' => '2024-05-10',
                        'employment_status' => 'permanent',
                    ],
                ],
            ]),
        ]);

        config([
            'services.hr_azzahra.url' => 'https://hr.example.com',
            'services.hr_azzahra.key' => 'secret-test-key',
        ]);

        $response = $this->actingAs($superadmin)
            ->post(route('tailors.sync-hr'));

        $response->assertRedirect();
        $response->assertSessionHas('status');

        $this->assertDatabaseHas('tailors', [
            'hr_employee_id' => 109,
            'hr_employee_number' => 'AZZ0109',
            'name' => 'Siti Nurhaliza',
            'type' => 'internal',
        ]);

        $tailor = Tailor::where('hr_employee_number', 'AZZ0109')->first();
        $this->assertNotNull($tailor->portal_token);
        $this->assertNotNull($tailor->tenureLabel());
    }
}
