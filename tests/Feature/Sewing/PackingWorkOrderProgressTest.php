<?php

namespace Tests\Feature\Sewing;

use App\Enums\TailorType;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Progres WO yang dibaca packingv2 harus bilang barang sedang dijahit di mana:
 * penjahit internal atau vendor makloon jahit (dengan nama vendornya).
 */
class PackingWorkOrderProgressTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private const KEY = 'kunci-uji-packing';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.packingv2.key' => self::KEY]);
    }

    private function packingItem(int $packingId, int $qty = 10): WorkOrderItem
    {
        $item = $this->readyItem(qty: $qty);
        $item->workOrder->update(['packing_production_order_id' => $packingId]);
        $item->update(['packing_production_order_item_id' => $packingId * 10]);

        return $item;
    }

    private function pickup(WorkOrderItem $item, TailorType $type, string $name, int $qty): void
    {
        $this->actingAs($this->warehouseAdmin())->post(route('pickups.store'), [
            'tailor_id' => $this->tailor($type, $name)->id,
            'items' => [['work_order_item_id' => $item->id, 'qty' => $qty]],
        ])->assertSessionHasNoErrors();
    }

    public function test_summary_shows_makloon_vendor_when_most_pieces_are_there(): void
    {
        $item = $this->packingItem(77);
        $this->pickup($item, TailorType::Internal, 'Bu Siti', 3);
        $this->pickup($item, TailorType::Makloon, 'Makloon Berkah', 5);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->getJson('/api/v1/packing/work-orders/progress?ids=77')
            ->assertOk()
            ->assertJsonPath('data.77.stage', 'makloon_sewing')
            ->assertJsonPath('data.77.stage_label', 'Di makloon jahit: Makloon Berkah')
            ->assertJsonPath('data.77.totals.sewing', 8)
            ->assertJsonPath('data.77.totals.sewing_internal', 3)
            ->assertJsonPath('data.77.totals.sewing_makloon', 5)
            ->assertJsonPath('data.77.sewing_locations', [
                ['type' => 'internal', 'name' => 'Penjahit internal', 'qty' => 3],
                ['type' => 'makloon', 'name' => 'Makloon Berkah', 'qty' => 5],
            ]);
    }

    public function test_summary_shows_internal_tailor_when_sewn_in_house(): void
    {
        $item = $this->packingItem(78);
        $this->pickup($item, TailorType::Internal, 'Bu Siti', 10);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->getJson('/api/v1/packing/work-orders/progress?ids=78')
            ->assertOk()
            ->assertJsonPath('data.78.stage', 'internal_sewing')
            ->assertJsonPath('data.78.stage_label', 'Di penjahit internal')
            ->assertJsonPath('data.78.totals.sewing_makloon', 0);
    }

    public function test_detail_lines_show_where_each_line_is_sewn(): void
    {
        $item = $this->packingItem(79, qty: 6);
        $this->pickup($item, TailorType::Makloon, 'CV Maju', 4);
        $this->pickup($item, TailorType::Makloon, 'CV Jaya', 2);

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->getJson('/api/v1/packing/work-orders/79/progress')
            ->assertOk()
            ->assertJsonPath('data.stage_label', 'Di makloon jahit: CV Maju, CV Jaya')
            ->assertJsonPath('data.items.0.packing_item_id', 790)
            ->assertJsonPath('data.items.0.stage', 'makloon_sewing')
            ->assertJsonPath('data.items.0.sewing_makloon', 6)
            ->assertJsonPath('data.items.0.sewing_internal', 0)
            ->assertJsonPath('data.items.0.sewing_locations.0.name', 'CV Maju');
    }

    public function test_delivered_pieces_are_no_longer_counted_at_the_vendor(): void
    {
        $item = $this->packingItem(80, qty: 4);
        $this->pickup($item, TailorType::Makloon, 'CV Maju', 4);

        $pickupItem = $item->pickupItems()->sole();
        $this->actingAs($this->warehouseAdmin())
            ->post(route('deliveries.store', $pickupItem), ['qty' => 4])
            ->assertSessionHasNoErrors();

        $this->withHeaders(['X-Api-Key' => self::KEY])
            ->getJson('/api/v1/packing/work-orders/progress?ids=80')
            ->assertOk()
            ->assertJsonPath('data.80.stage', 'done')
            ->assertJsonPath('data.80.totals.sewing_makloon', 0)
            ->assertJsonPath('data.80.sewing_locations', []);
    }
}
