<?php

namespace Tests\Feature\Sewing;

use App\Models\PickupItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HancaanDistributionTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_report_shares_pickups_per_tailor_per_brand(): void
    {
        $admin = $this->warehouseAdmin();
        $loka = $this->article('Marina', 7000);
        $loka->update(['brand_name' => 'Loka']);
        $aurora = $this->article('Gamita', 9000);
        $aurora->update(['brand_name' => 'Aurora']);

        $siti = $this->tailor(name: 'Bu Siti');
        $rini = $this->tailor(name: 'Bu Rini');

        $lokaItem = $this->readyItem(qty: 20, article: $loka);
        $auroraItem = $this->readyItem(qty: 20, article: $aurora);

        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $siti->id, 'items' => [
            ['work_order_item_id' => $lokaItem->id, 'qty' => 6],
            ['work_order_item_id' => $auroraItem->id, 'qty' => 2],
        ]])->assertSessionHasNoErrors();
        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $rini->id, 'items' => [
            ['work_order_item_id' => $lokaItem->id, 'qty' => 3],
        ]])->assertSessionHasNoErrors();
        // Ambilan dibatalkan tidak dihitung.
        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $rini->id, 'items' => [
            ['work_order_item_id' => $auroraItem->id, 'qty' => 5],
        ]]);
        $this->actingAs($admin)->post(route('pickup-items.cancel', PickupItem::query()->latest('id')->first()))->assertSessionHasNoErrors();

        $this->actingAs($this->owner())
            ->get(route('production-reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('distribution.brands.0.name', 'Loka')
                ->where('distribution.brands.0.qty', 9)
                ->where('distribution.brands.1.name', 'Aurora')
                ->where('distribution.brands.1.qty', 2)
                ->where('distribution.tailors.0.name', 'Bu Siti')
                ->where('distribution.tailors.0.qty', 8)
                ->where('distribution.tailors.0.segments.b0.qty', 6)
                ->where('distribution.tailors.0.segments.b0.amount', 42000)
                ->where('distribution.tailors.0.segments.b1.qty', 2)
                ->where('distribution.tailors.1.name', 'Bu Rini')
                ->where('distribution.tailors.1.qty', 3));
    }
}
