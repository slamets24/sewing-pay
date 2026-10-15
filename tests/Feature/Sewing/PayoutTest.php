<?php

namespace Tests\Feature\Sewing;

use App\Enums\PayoutStatus;
use App\Enums\RevisionFoundAt;
use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use App\Enums\TailorType;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayoutTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function delivered(Tailor $tailor, int $qty, string $deliveredAt): SewingDelivery
    {
        $admin = $this->warehouseAdmin();
        $item = $this->readyItem(qty: $qty);

        $this->actingAs($admin)->post(route('pickups.store'), [
            'tailor_id' => $tailor->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => $qty]],
        ]);
        $pickupItem = $tailor->pickupItems()->latest('id')->first();
        $this->actingAs($admin)->post(route('deliveries.store', $pickupItem), ['qty' => $qty, 'delivered_at' => $deliveredAt]);

        return SewingDelivery::query()->latest('id')->first();
    }

    public function test_payout_collects_unpaid_work_up_to_the_cutoff_date(): void
    {
        $owner = $this->owner();
        $siti = $this->tailor(name: 'Bu Siti');
        $makloon = $this->tailor(TailorType::Makloon, 'Makloon');

        $this->delivered($siti, 2, '2026-10-05 10:00');
        $this->delivered($siti, 3, '2026-10-12 10:00');
        $this->delivered($makloon, 5, '2026-10-05 10:00');

        Revision::create([
            'type' => RevisionType::Material,
            'status' => RevisionStatus::Done,
            'found_at' => RevisionFoundAt::Qc,
            'work_order_item_id' => SewingDelivery::query()->first()->work_order_item_id,
            'part_name' => 'Badan Depan',
            'tailor_id' => $siti->id,
            'qty' => 1,
            'rate' => 10000,
            'subtotal' => 10000,
            'reported_at' => '2026-10-06 09:00',
            'completed_at' => '2026-10-07 09:00',
        ]);

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10'])->assertSessionHasNoErrors();

        $payout = Payout::query()->sole();
        $slip = $payout->slips()->sole();

        $this->assertSame($siti->id, $slip->tailor_id);
        $this->assertSame(2, $slip->qty);
        $this->assertSame(2 * 7000 + 10000, $slip->gross_amount);
        $this->assertCount(2, $slip->lines);
        $this->assertSame(24000, $payout->total_amount);
    }

    public function test_regenerate_keeps_bonus_and_only_one_draft_is_allowed(): void
    {
        $owner = $this->owner();
        $siti = $this->tailor();
        $this->delivered($siti, 2, '2026-10-05 10:00');

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $payout = Payout::query()->sole();
        $slip = $payout->slips()->sole();

        $this->actingAs($owner)->patch(route('payout-slips.update', $slip), ['bonus_amount' => 5000, 'deduction_amount' => 1000])->assertSessionHasNoErrors();
        $this->delivered($siti, 1, '2026-10-09 10:00');

        $this->actingAs($owner)->post(route('payouts.regenerate', $payout))->assertSessionHasNoErrors();

        $slip = $payout->slips()->sole();
        $this->assertSame(3 * 7000, $slip->gross_amount);
        $this->assertSame(5000, $slip->bonus_amount);
        $this->assertSame(3 * 7000 + 4000, $slip->net_amount);

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-20'])->assertSessionHasErrors('cutoff_date');
    }

    public function test_paid_work_is_not_paid_twice_and_slipped_delivery_cannot_be_undone(): void
    {
        $owner = $this->owner();
        $siti = $this->tailor();
        $delivery = $this->delivered($siti, 2, '2026-10-05 10:00');

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $payout = Payout::query()->sole();

        $this->actingAs($owner)->delete(route('deliveries.destroy', $delivery))->assertSessionHasErrors('delivery');

        $this->actingAs($owner)->post(route('payouts.paid', $payout))->assertSessionHasNoErrors();
        $this->assertSame(PayoutStatus::Paid, $payout->refresh()->status);

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-24'])->assertSessionHasNoErrors();
        $this->assertSame(0, Payout::query()->latest('id')->first()->slips()->count());
        $this->actingAs($owner)->post(route('payouts.regenerate', $payout))->assertSessionHasErrors('payout');
    }

    public function test_draft_with_a_paid_slip_cannot_be_regenerated(): void
    {
        $owner = $this->owner();
        $this->delivered($this->tailor(name: 'Bu Siti'), 2, '2026-10-05 10:00');
        $this->delivered($this->tailor(name: 'Pak Darto'), 1, '2026-10-05 11:00');

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $payout = Payout::query()->sole();
        $paidSlip = $payout->slips()->first();

        $this->actingAs($owner)->post(route('payout-slips.paid', $paidSlip))->assertSessionHasNoErrors();
        $this->actingAs($owner)->post(route('payouts.regenerate', $payout))->assertSessionHasErrors('payout');

        $this->assertSame(PayoutStatus::Paid, $paidSlip->refresh()->status);
        $this->assertNotNull($paidSlip->paid_at);
    }

    public function test_deleting_a_draft_releases_its_work(): void
    {
        $owner = $this->owner();
        $this->delivered($this->tailor(), 2, '2026-10-05 10:00');

        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $this->actingAs($owner)->delete(route('payouts.destroy', Payout::query()->sole()))->assertSessionHasNoErrors();

        $this->assertSame(0, PayoutSlip::query()->count());
        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $this->assertSame(14000, Payout::query()->sole()->total_amount);
    }

    public function test_public_slip_page_needs_the_right_token(): void
    {
        $owner = $this->owner();
        $this->delivered($this->tailor(), 2, '2026-10-05 10:00');
        $this->actingAs($owner)->post(route('payouts.store'), ['cutoff_date' => '2026-10-10']);
        $slip = PayoutSlip::query()->sole();

        auth()->logout();

        $this->get(route('payout-slips.public', [$slip->invoice_number, $slip->public_token]))->assertOk();
        $this->get(route('payout-slips.public', [$slip->invoice_number, 'wrong-token']))->assertNotFound();
    }

    public function test_portal_shows_only_the_tailor_behind_the_link(): void
    {
        $siti = $this->tailor(name: 'Bu Siti');
        $this->delivered($siti, 2, '2026-10-05 10:00');
        $siti->generatePortal();
        $siti->changePortalPin('654321');

        $this->get(route('portal.show', ['tailor' => $siti->portal_token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Portal/Pin'));

        $this->post(route('portal.pin.store', ['tailor' => $siti->portal_token]), ['pin' => '654321'])
            ->assertRedirect(route('portal.show', ['tailor' => $siti->portal_token]));

        $this->get(route('portal.show', ['tailor' => $siti->portal_token]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Portal/Index')
                ->where('tailor.id', $siti->id)
                ->where('unpaid.qty', 2)
                ->where('unpaid.amount', 14000));
    }

    public function test_a_new_portal_requires_a_new_pin_and_the_owner_can_create_the_link(): void
    {
        $owner = $this->owner();
        $siti = $this->tailor(name: 'Bu Siti');

        $this->actingAs($owner)->post(route('tailors.portal.store', $siti))->assertSessionHasNoErrors();
        $siti->refresh();
        $this->assertNotNull($siti->portal_token);

        $this->post(route('portal.pin.store', ['tailor' => $siti->portal_token]), ['pin' => '123456'])
            ->assertSessionHasErrors('new_pin');

        $this->post(route('portal.pin.store', ['tailor' => $siti->portal_token]), [
            'pin' => '123456',
            'new_pin' => '654321',
            'new_pin_confirmation' => '654321',
        ])->assertRedirect(route('portal.show', ['tailor' => $siti->portal_token]));

        $this->get(route('portal.show', ['tailor' => $siti->portal_token]))
            ->assertInertia(fn ($page) => $page->component('Portal/Index')->where('tailor.name', 'Bu Siti'));

        $this->get('/portal/tidak-ada')->assertNotFound();
    }
}
