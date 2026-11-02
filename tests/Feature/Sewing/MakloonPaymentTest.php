<?php

namespace Tests\Feature\Sewing;

use App\Enums\TailorType;
use App\Models\MakloonPayment;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MakloonPaymentTest extends TestCase
{
    use RefreshDatabase;
    use SewingTestHelpers;

    public function test_makloon_payment_page_loads_with_unpaid_stats(): void
    {
        $owner = $this->owner();
        $makloon = $this->tailor(TailorType::Makloon, 'Makloon Sinar');

        $article = $this->article(name: 'Gamis Rayon', rate: 7000);
        $article->update(['makloon_sewing_rate' => 10000]);

        $item = $this->readyItem(qty: 20, article: $article);

        // Pickup
        $this->actingAs($owner)->post(route('pickups.store'), [
            'tailor_id' => $makloon->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 15]],
        ]);
        $pickupItem = PickupItem::query()->sole();

        // Deliver
        $this->actingAs($owner)->post(route('deliveries.store', $pickupItem), [
            'qty' => 10,
        ]);

        $this->actingAs($owner)->get(route('makloon-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MakloonPayments/Index')
                ->has('tailors', 1)
                ->where('tailors.0.unpaid_count', 1)
                ->where('tailors.0.unpaid_qty', 10)
                ->where('tailors.0.unpaid_amount', 100000)
            );
    }

    public function test_superadmin_can_create_makloon_payment_from_selected_deliveries(): void
    {
        $owner = $this->owner();
        $makloon = $this->tailor(TailorType::Makloon, 'Makloon Barokah');

        $article1 = $this->article(name: 'Khimar', rate: 5000);
        $article1->update(['makloon_sewing_rate' => 6000]);

        $item1 = $this->readyItem(qty: 30, article: $article1);

        $this->actingAs($owner)->post(route('pickups.store'), [
            'tailor_id' => $makloon->id,
            'items' => [['work_order_item_id' => $item1->id, 'qty' => 30]],
        ]);
        $pickupItem1 = PickupItem::query()->sole();

        // 2 separate deliveries
        $this->actingAs($owner)->post(route('deliveries.store', $pickupItem1), ['qty' => 10]);
        $this->actingAs($owner)->post(route('deliveries.store', $pickupItem1), ['qty' => 20]);

        $deliveries = SewingDelivery::query()->orderBy('id')->get();
        $this->assertCount(2, $deliveries);

        // Pay only the first delivery (flexible per-nota payment!)
        $response = $this->actingAs($owner)->post(route('makloon-payments.store'), [
            'tailor_id' => $makloon->id,
            'delivery_ids' => [$deliveries[0]->id],
            'payment_date' => '2026-11-01',
            'adjustment_amount' => -5000, // deduction e.g. for accessories or delay
            'payment_method' => 'transfer',
            'notes' => 'Pembayaran nota 1',
        ]);

        $payment = MakloonPayment::query()->sole();
        $response->assertRedirect(route('makloon-payments.show', $payment));

        $this->assertSame($makloon->id, $payment->tailor_id);
        $this->assertSame(10, $payment->total_qty);
        $this->assertSame(60000, $payment->gross_amount);
        $this->assertSame(-5000, $payment->adjustment_amount);
        $this->assertSame(55000, $payment->net_amount);
        $this->assertCount(1, $payment->lines);

        // The second delivery remains unpaid
        $unpaid = SewingDelivery::query()
            ->where('tailor_id', $makloon->id)
            ->whereDoesntHave('makloonPaymentLine')
            ->get();

        $this->assertCount(1, $unpaid);
        $this->assertSame($deliveries[1]->id, $unpaid->first()->id);
    }

    public function test_cannot_create_payment_for_internal_tailor(): void
    {
        $owner = $this->owner();
        $internal = $this->tailor(TailorType::Internal, 'Pak Joko');

        $item = $this->readyItem(qty: 10);
        $this->actingAs($owner)->post(route('pickups.store'), [
            'tailor_id' => $internal->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 10]],
        ]);
        $pickupItem = PickupItem::query()->sole();
        $this->actingAs($owner)->post(route('deliveries.store', $pickupItem), ['qty' => 10]);
        $delivery = SewingDelivery::query()->sole();

        $this->actingAs($owner)->post(route('makloon-payments.store'), [
            'tailor_id' => $internal->id,
            'delivery_ids' => [$delivery->id],
        ])->assertSessionHasErrors('tailor_id');
    }

    public function test_payment_can_be_deleted_restoring_deliveries(): void
    {
        $owner = $this->owner();
        $makloon = $this->tailor(TailorType::Makloon, 'Makloon Berkah');

        $item = $this->readyItem(qty: 10);
        $this->actingAs($owner)->post(route('pickups.store'), [
            'tailor_id' => $makloon->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => 10]],
        ]);
        $pickupItem = PickupItem::query()->sole();
        $this->actingAs($owner)->post(route('deliveries.store', $pickupItem), ['qty' => 10]);
        $delivery = SewingDelivery::query()->sole();

        $this->actingAs($owner)->post(route('makloon-payments.store'), [
            'tailor_id' => $makloon->id,
            'delivery_ids' => [$delivery->id],
        ]);

        $payment = MakloonPayment::query()->sole();
        $this->assertFalse(SewingDelivery::whereDoesntHave('makloonPaymentLine')->exists());

        // Delete payment
        $this->actingAs($owner)->delete(route('makloon-payments.destroy', $payment))
            ->assertRedirect(route('makloon-payments.index'));

        $this->assertDatabaseMissing('makloon_payments', ['id' => $payment->id]);
        $this->assertTrue(SewingDelivery::whereDoesntHave('makloonPaymentLine')->exists());
    }
}
