<?php

namespace Tests\Feature\Api;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\Tailor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExternalPayrollApiTest extends TestCase
{
    use RefreshDatabase;

    private const INTERNAL_KEY = 'secret-test-internal-key-1234567890';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.internal_api.key' => self::INTERNAL_KEY]);
    }

    public function test_rejects_unauthorized_request(): void
    {
        $response = $this->getJson('/api/v1/external/payroll-slips?employee_number=AZZ0109');
        $response->assertStatus(401);
    }

    public function test_returns_payroll_slips_for_employee(): void
    {
        $tailor = Tailor::create([
            'code' => 'SITI',
            'name' => 'Siti Aminah',
            'type' => 'internal',
            'hr_employee_id' => 109,
            'hr_employee_number' => 'AZZ0109',
            'joined_at' => now()->subYears(2),
        ]);

        $payout = Payout::create([
            'code' => 'PAY-2611-001',
            'cutoff_date' => now()->toDateString(),
            'notes' => 'Gajian periode 1',
        ]);

        $slip = PayoutSlip::create([
            'payout_id' => $payout->id,
            'tailor_id' => $tailor->id,
            'invoice_number' => 'SLIP-2611-001',
            'public_token' => 'slip-token-xyz-12345',
            'status' => PayoutStatus::Paid,
            'qty' => 50,
            'gross_amount' => 1500000,
            'bonus_amount' => 0,
            'deduction_amount' => 200000,
            'net_amount' => 1300000,
            'paid_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Internal-Key' => self::INTERNAL_KEY])
            ->getJson('/api/v1/external/payroll-slips?employee_number=AZZ0109');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.tailor.name', 'Siti Aminah')
            ->assertJsonPath('data.tailor.hr_employee_number', 'AZZ0109')
            ->assertJsonCount(1, 'data.slips')
            ->assertJsonPath('data.slips.0.invoice_number', 'SLIP-2611-001')
            ->assertJsonPath('data.slips.0.net_amount', 1300000);
    }
}
