<?php

namespace Tests\Feature\Sewing;

use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\PayoutSlipLine;
use App\Models\PickupItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayoutResetTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function paidPayout(): Payout
    {
        $admin = $this->warehouseAdmin();
        $owner = $this->owner();

        foreach (['Bu Siti', 'Bu Rini'] as $name) {
            $tailor = $this->tailor(name: $name);
            $item = $this->readyItem(qty: 2);
            $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 2]]]);
            $this->actingAs($admin)->post(route('deliveries.store', PickupItem::query()->latest('id')->first()), ['qty' => 2, 'delivered_at' => '2026-11-10 10:00']);
        }

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-11-15'])->assertSessionHasNoErrors();
        $payout = Payout::query()->firstOrFail();
        $this->actingAs($owner)->post(route('payout-slips.paid', $payout->slips()->first()));

        return $payout;
    }

    public function test_partially_paid_payout_cannot_be_deleted_as_draft(): void
    {
        $payout = $this->paidPayout();

        $this->actingAs($this->owner())->delete(route('payouts.destroy', $payout))->assertSessionHasErrors('payout');
        $this->assertDatabaseHas('payouts', ['id' => $payout->id]);
    }

    public function test_owner_can_force_delete_and_redo_payout(): void
    {
        $payout = $this->paidPayout();
        $owner = $this->owner();

        $this->actingAs($owner)
            ->delete(route('payouts.force-destroy', $payout), ['confirm_code' => 'salah'])
            ->assertSessionHasErrors('confirm_code');
        $this->assertDatabaseHas('payouts', ['id' => $payout->id]);

        $this->actingAs($owner)
            ->delete(route('payouts.force-destroy', $payout), ['confirm_code' => $payout->code])
            ->assertRedirect(route('payouts.index'));

        $this->assertSame(0, Payout::query()->count());
        $this->assertSame(0, PayoutSlip::query()->count());
        $this->assertSame(0, PayoutSlipLine::query()->count());

        // Setoran kembali belum dibayar: pencairan baru memuat lagi semuanya.
        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-11-15'])->assertSessionHasNoErrors();
        $this->assertSame(2, Payout::query()->firstOrFail()->slips()->count());
    }

    public function test_admin_cannot_force_delete_payout(): void
    {
        $payout = $this->paidPayout();

        $this->actingAs($this->warehouseAdmin())
            ->delete(route('payouts.force-destroy', $payout), ['confirm_code' => $payout->code])
            ->assertForbidden();
    }
}
