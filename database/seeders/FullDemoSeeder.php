<?php

namespace Database\Seeders;

use App\Actions\Sewing\AdvanceRevisionAction;
use App\Actions\Sewing\CancelPickupItemAction;
use App\Actions\Sewing\CreatePayoutAction;
use App\Actions\Sewing\CreatePickupAction;
use App\Actions\Sewing\CreateQcShipmentAction;
use App\Actions\Sewing\CreateWorkOrderAction;
use App\Actions\Sewing\ManagePayoutSlipAction;
use App\Actions\Sewing\ReceiveHancaanAction;
use App\Actions\Sewing\RecordDeliveryAction;
use App\Actions\Sewing\ReportRevisionAction;
use App\Enums\ArticleSource;
use App\Enums\RevisionFoundAt;
use App\Enums\RevisionType;
use App\Enums\TailorType;
use App\Enums\UserRole;
use App\Models\Article;
use App\Models\ArticleAlias;
use App\Models\Payout;
use App\Models\Pickup;
use App\Models\PickupItem;
use App\Models\Revision;
use App\Models\RevisionPart;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Local-only full floor: three weeks of history replayed through the real actions, so every screen has data
 * in every state (WO stages, cancelled pickup, QC shipments, revisions per status, paid and half-paid payouts).
 * The clock is moved back while replaying, so dates look like real use. Skips itself once LOKA 310 exists.
 */
class FullDemoSeeder extends Seeder
{
    private ?int $ownerId = null;

    public function run(): void
    {
        $this->call([RevisionPartSeeder::class, SewingDemoSeeder::class, ArticleBenchmarkDemoSeeder::class]);

        if (WorkOrder::query()->where('number', 'LOKA 310')->exists()) {
            return;
        }

        $this->ownerId = User::query()->where('email', 'test@example.com')->value('id');

        try {
            $this->at(21, '07:30');
            $this->staff();
            $tailors = $this->tailors();
            $articles = $this->articles();

            $this->firstWeek($tailors, $articles);
            $this->secondWeek($tailors, $articles);
            $this->thisWeek($tailors, $articles);

            $tailors['PNJ-005']->update(['is_active' => false]);
        } finally {
            Carbon::setTestNow();
        }
    }

    private function staff(): void
    {
        User::query()->updateOrCreate(['email' => 'produksi@example.com'], [
            'name' => 'Admin Produksi',
            'role' => UserRole::Admin,
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
    }

    /** @return array<string, Tailor> */
    private function tailors(): array
    {
        foreach ([
            ['PNJ-004', 'Bu Rini', TailorType::Internal, '081211110004'],
            ['PNJ-005', 'Pak Joko', TailorType::Internal, '081211110005'],
            ['MKL-002', 'Makloon Sinar Jaya', TailorType::Makloon, '081211110006'],
        ] as [$code, $name, $type, $phone]) {
            $tailor = Tailor::query()->firstOrCreate(['code' => $code], [
                'name' => $name,
                'type' => $type,
                'whatsapp_number' => $phone,
                'address' => 'Kp. Cibaduyut RT 02/05',
                'joined_at' => today()->subMonths(4),
                'is_active' => true,
            ]);

            if (blank($tailor->portal_token)) {
                $tailor->generatePortal();
            }
        }

        $tailors = Tailor::query()->get()->keyBy('code')->all();
        $tailors['PNJ-001']->changePortalPin('246810');

        return $tailors;
    }

    /** @return array<string, Article> */
    private function articles(): array
    {
        foreach ([
            [9001, 'Aluna', 'Tunik', 6500, ['Sage', 'Dusty Pink'], ['S', 'M', 'L']],
            [9002, 'Kirana', 'Kulot', 5000, ['Black', 'Mocca'], ['M', 'L', 'XL']],
        ] as $index => [$packingId, $name, $category, $rate, $colors, $sizes]) {
            $article = Article::query()->firstOrCreate(['packing_article_id' => $packingId], [
                'source' => ArticleSource::Packingv2,
                'name' => $name,
                'brand_name' => 'Loka',
                'category_name' => $category,
                'sewing_rate' => $rate,
                'is_active' => true,
                'synced_at' => now(),
            ]);

            $barcode = 0;

            foreach ($colors as $color) {
                foreach ($sizes as $size) {
                    $barcode++;
                    $article->variants()->firstOrCreate(['packing_master_barcode_id' => $packingId * 100 + $barcode], [
                        'barcode_value' => '899'.$packingId.str_pad((string) $barcode, 3, '0', STR_PAD_LEFT),
                        'item_type' => $category,
                        'color' => $color,
                        'size' => $size,
                        'size_sort' => array_search($size, ['S', 'M', 'L', 'XL'], true),
                        'is_active' => true,
                    ]);
                }
            }
        }

        Article::query()->firstOrCreate(['name' => 'Seruni'], [
            'source' => ArticleSource::Manual,
            'category_name' => 'Blouse',
            'sewing_rate' => 5500,
            'is_active' => false,
            'notes' => 'Sudah tidak diproduksi.',
        ]);

        $articles = Article::query()->get()->keyBy('name')->all();

        foreach (['marina set' => 'Marina', 'mrn' => 'Marina', 'cecil' => 'Cecilia', 'tunik aluna' => 'Aluna'] as $alias => $name) {
            ArticleAlias::query()->firstOrCreate(['alias' => $alias], ['article_id' => $articles[$name]->id]);
        }

        return $articles;
    }

    /**
     * LOKA 310 runs end to end: received, sewn, shipped to QC, two revisions, then the first pay run is paid in full.
     *
     * @param  array<string, Tailor>  $t
     * @param  array<string, Article>  $a
     */
    private function firstWeek(array $t, array $a): void
    {
        $this->at(20, '09:00');
        $wo = $this->workOrder('LOKA 310', 'Orderan reseller', 8, [
            [$a['Marina'], 'Teal blue', 'S', 10],
            [$a['Marina'], 'Teal blue', 'M', 10],
            [$a['Marina'], 'Teal blue', 'L', 10],
            [$a['Aluna'], 'Sage', 'M', 8],
        ]);
        app(ReceiveHancaanAction::class)->receiveAllPending($wo, $this->ownerId);

        $this->at(19, '08:15');
        $siti = $this->pickup($t['PNJ-001'], [[$wo->items[0], 10]]);
        $darto = $this->pickup($t['PNJ-002'], [[$wo->items[1], 10]]);
        $joko = $this->pickup($t['PNJ-005'], [[$wo->items[2], 10]]);
        $makloon = $this->pickup($t['MKL-001'], [[$wo->items[3], 8]]);

        $this->at(17, '15:00');
        $sitiFirst = $this->deliver($siti, 6);
        $dartoAll = $this->deliver($darto, 10);
        $this->deliver($joko, 10);

        $this->at(16, '14:30');
        $this->deliver($siti, 4);
        $this->deliver($makloon, 8, 'Setor makloon, harga dihitung terpisah.');
        $this->ship('Kiriman QC pertama LOKA 310');

        $this->at(15, '10:00');
        $sewingFix = $this->revision(RevisionType::Sewing, $dartoAll, 2, notes: 'Jahitan samping miring.');
        $materialFix = $this->revision(RevisionType::Material, $sitiFirst, 1, 'Ganti Kerah', 'Kerah belang warna.');

        $this->at(14, '11:00');
        $this->advance($sewingFix);
        $this->advance($materialFix);

        $this->at(14, '16:00');
        $payout = app(CreatePayoutAction::class)->execute(today()->toDateString(), 'Gajian minggu ke-1', $this->ownerId);
        $this->adjust($payout, $t['PNJ-001'], bonus: 20_000, notes: 'Bonus target tercapai.');
        $this->adjust($payout, $t['PNJ-005'], deduction: 10_000, notes: 'Potong kasbon.');
        app(ManagePayoutSlipAction::class)->markAllPaid($payout);

        $this->at(13, '09:00');
        $this->advance($materialFix);

        $this->at(12, '13:00');
        $this->advance($materialFix);
    }

    /**
     * LOKA 316 is still moving: partial hancaan, a wrong pickup cancelled, a material defect handed back to the warehouse.
     *
     * @param  array<string, Tailor>  $t
     * @param  array<string, Article>  $a
     */
    private function secondWeek(array $t, array $a): void
    {
        $this->at(12, '08:30');
        $wo = $this->workOrder('LOKA 316', 'Orderan toko online', 14, [
            [$a['Cecilia'], 'Coffe', 'M', 12],
            [$a['Cecilia'], 'Coffe', 'L', 12],
            [$a['Taleena'], 'Black', 'S', 8],
            [$a['Vella'], 'Khaki', 'M', 6],
            [$a['Kirana'], 'Black', 'M', 6],
        ], 'Cecilia coffe M 12, L 12. Taleena black S 8. Vella khaki M 6. Kirana black M 6.');
        [$cecilM, $cecilL, $taleena, $vella] = $wo->items->all();

        $receive = app(ReceiveHancaanAction::class);
        $receive->receive($cecilM, 12, createdBy: $this->ownerId);
        $receive->receive($cecilL, 6, notes: 'Sisa 6 masih di potong.', createdBy: $this->ownerId);
        $receive->receive($taleena, 8, createdBy: $this->ownerId);
        $receive->receive($vella, 6, createdBy: $this->ownerId);

        $this->at(11, '08:00');
        $rini = $this->pickup($t['PNJ-004'], [[$cecilM, 12]]);
        $darto = $this->pickup($t['PNJ-002'], [[$taleena, 8], [$cecilL, 3]]);
        $siti = $this->pickup($t['PNJ-001'], [[$vella, 6]]);

        $this->at(11, '08:20');
        app(CancelPickupItemAction::class)->execute($this->line($darto, $cecilL));

        $this->at(10, '15:30');
        $riniFirst = $this->deliver($rini, 8);
        $dartoFirst = $this->deliver($this->line($darto, $taleena), 5);

        $this->at(9, '14:00');
        $this->deliver($siti, 4);
        $this->revision(RevisionType::Material, $siti, 2, 'Badan Depan', 'Bahan bolong, dikembalikan ke gudang.', returnToWarehouse: true);

        $this->at(8, '10:00');
        $this->ship();

        $this->at(7, '11:00');
        $this->revision(RevisionType::Sewing, $riniFirst, 1, notes: 'Kancing lepas.');

        $this->at(6, '10:30');
        $sleeve = $this->revision(RevisionType::Material, $dartoFirst, 1, 'Ganti Tangan', 'Tangan kiri luntur.');

        $this->at(5, '15:00');
        $this->deliver($rini, 4);
        $this->deliver($this->line($darto, $taleena), 3);

        $this->at(4, '09:00');
        $this->advance($sleeve, $t['PNJ-004']->id);

        $this->at(3, '13:30');
        $this->revision(RevisionType::Material, $riniFirst, 1, 'Badan Belakang', 'Print belakang geser.');
    }

    /**
     * New WO not received yet, a makloon still holding pieces, and a second pay run with only one slip paid.
     *
     * @param  array<string, Tailor>  $t
     * @param  array<string, Article>  $a
     */
    private function thisWeek(array $t, array $a): void
    {
        $this->at(2, '09:00');
        $wo = $this->workOrder('LOKA 320', 'Orderan reseller & toko online', 7, [
            [$a['Marina'], 'Brown', 'L', 6],
            [$a['Aluna'], 'Dusty Pink', 'S', 10],
            [$a['Kirana'], 'Mocca', 'XL', 5],
        ]);
        app(ReceiveHancaanAction::class)->receive($wo->items[0], 6, createdBy: $this->ownerId);
        $this->pickup($t['MKL-002'], [[$wo->items[0], 3]]);

        $this->at(1, '08:00');
        $cecilL = WorkOrderItem::query()->whereHas('workOrder', fn ($q) => $q->where('number', 'LOKA 316'))->where('size', 'L')->firstOrFail();
        $yanti = $this->pickup($t['PNJ-003'], [[$cecilL, 4]]);

        $this->at(1, '16:00');
        $this->deliver($yanti, 1);

        $this->at(1, '17:00');
        $payout = app(CreatePayoutAction::class)->execute(today()->toDateString(), 'Gajian minggu ke-2', $this->ownerId);
        $this->adjust($payout, $t['PNJ-002'], bonus: 15_000, notes: 'Lembur Sabtu.');
        app(ManagePayoutSlipAction::class)->markPaid($payout->slips()->where('tailor_id', $t['PNJ-004']->id)->firstOrFail());
    }

    private function at(int $daysAgo, string $time): void
    {
        Carbon::setTestNow(null);
        Carbon::setTestNow(Carbon::parse(today()->subDays($daysAgo)->toDateString().' '.$time));
    }

    /** @param  list<array{Article, string, string, int}>  $lines */
    private function workOrder(string $number, string $channel, int $dueInDays, array $lines, ?string $sourceText = null): WorkOrder
    {
        return app(CreateWorkOrderAction::class)->execute([
            'number' => $number,
            'channel' => $channel,
            'category' => 'PRINT',
            'due_at' => today()->addDays($dueInDays)->toDateString(),
            'source_text' => $sourceText,
            'items' => array_map(fn (array $line) => [
                'article_id' => $line[0]->id,
                'color' => $line[1],
                'size' => $line[2],
                'planned_qty' => $line[3],
            ], $lines),
        ], $this->ownerId);
    }

    /**
     * One line gives back its PickupItem, several lines the whole Pickup.
     *
     * @param  list<array{WorkOrderItem, int}>  $lines
     */
    private function pickup(Tailor $tailor, array $lines): Pickup|PickupItem
    {
        $pickup = app(CreatePickupAction::class)->execute([
            'tailor_id' => $tailor->id,
            'items' => array_map(fn (array $line) => ['work_order_item_id' => $line[0]->id, 'qty' => $line[1]], $lines),
        ], $this->ownerId);

        return count($lines) === 1 ? $pickup->items->first() : $pickup;
    }

    private function line(Pickup $pickup, WorkOrderItem $item): PickupItem
    {
        return $pickup->items->firstWhere('work_order_item_id', $item->id);
    }

    private function deliver(PickupItem $pickupItem, int $qty, ?string $notes = null): SewingDelivery
    {
        return app(RecordDeliveryAction::class)->execute($pickupItem, $qty, notes: $notes, createdBy: $this->ownerId);
    }

    private function ship(?string $notes = null): void
    {
        $ids = SewingDelivery::query()->whereNull('qc_shipment_id')->where('delivered_at', '<=', now())->pluck('id')->all();
        app(CreateQcShipmentAction::class)->execute($ids, $notes, $this->ownerId);
    }

    private function revision(RevisionType $type, SewingDelivery|PickupItem $source, int $qty, ?string $part = null, ?string $notes = null, bool $returnToWarehouse = false): Revision
    {
        return app(ReportRevisionAction::class)->execute([
            'type' => $type->value,
            'found_at' => ($source instanceof SewingDelivery ? RevisionFoundAt::Qc : RevisionFoundAt::Sewing)->value,
            'sewing_delivery_id' => $source instanceof SewingDelivery ? $source->id : null,
            'pickup_item_id' => $source instanceof PickupItem ? $source->id : null,
            'return_to_warehouse' => $returnToWarehouse,
            'revision_part_id' => $part ? RevisionPart::query()->where('name', $part)->value('id') : null,
            'qty' => $qty,
            'notes' => $notes,
        ], $this->ownerId);
    }

    private function advance(Revision $revision, ?int $tailorId = null): void
    {
        app(AdvanceRevisionAction::class)->execute($revision, $tailorId);
    }

    private function adjust(Payout $payout, Tailor $tailor, int $bonus = 0, int $deduction = 0, ?string $notes = null): void
    {
        app(ManagePayoutSlipAction::class)->adjust(
            $payout->slips()->where('tailor_id', $tailor->id)->firstOrFail(),
            ['bonus_amount' => $bonus, 'deduction_amount' => $deduction, 'notes' => $notes],
        );
    }
}
