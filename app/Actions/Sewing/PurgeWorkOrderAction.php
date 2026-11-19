<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutStatus;
use App\Models\MakloonPaymentLine;
use App\Models\Pickup;
use App\Models\PickupItem;
use App\Models\QcShipment;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\WorkOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Hapus total" WO yang sudah berjalan (khusus Owner): WO beserta hancaan, cutting, ambilan penjahit,
 * setoran, revisi, dan kiriman QC yang jadi kosong.
 *
 * Ditolak kalau ada setoran/revisi WO ini yang sudah masuk slip gaji atau pembayaran makloon,
 * supaya angka gaji yang sudah dihitung/dibayar tidak berubah diam-diam.
 */
class PurgeWorkOrderAction
{
    /**
     * Ringkasan yang akan ikut terhapus dan alasan yang menghalangi.
     *
     * @return array{counts: array<string, int>, blockers: list<string>}
     */
    public function preview(WorkOrder $workOrder): array
    {
        $itemIds = $workOrder->items()->pluck('id');
        $deliveryIds = SewingDelivery::query()->whereIn('work_order_item_id', $itemIds)->pluck('id');
        $revisionIds = Revision::query()->whereIn('work_order_item_id', $itemIds)->pluck('id');

        $slipLines = DB::table('payout_slip_lines')
            ->join('payout_slips', 'payout_slips.id', '=', 'payout_slip_lines.payout_slip_id')
            ->join('payouts', 'payouts.id', '=', 'payout_slips.payout_id')
            ->where(fn ($query) => $query
                ->whereIn('payout_slip_lines.sewing_delivery_id', $deliveryIds)
                ->orWhereIn('payout_slip_lines.revision_id', $revisionIds))
            ->select('payouts.code', 'payout_slips.status')
            ->get();

        $blockers = [];

        $paid = $slipLines->where('status', PayoutStatus::Paid->value)->pluck('code')->unique()->values();
        if ($paid->isNotEmpty()) {
            $blockers[] = 'Sudah masuk slip gaji yang DIBAYAR ('.$paid->implode(', ').'). Gaji yang sudah dibayar tidak bisa ditarik.';
        }

        $draft = $slipLines->where('status', '!=', PayoutStatus::Paid->value)->pluck('code')->unique()->values();
        if ($draft->isNotEmpty()) {
            $blockers[] = 'Masih ada di draft gaji ('.$draft->implode(', ').'). Hapus draft gaji itu dulu, lalu coba lagi.';
        }

        if (MakloonPaymentLine::query()->whereIn('sewing_delivery_id', $deliveryIds)->exists()) {
            $blockers[] = 'Sudah masuk pembayaran makloon. Hapus pembayaran makloon itu dulu.';
        }

        return [
            'counts' => [
                'items' => $itemIds->count(),
                'hancaan' => DB::table('hancaan_receipts')->whereIn('work_order_item_id', $itemIds)->count(),
                'cutting' => DB::table('cutting_receipts')->whereIn('work_order_item_id', $itemIds)->count(),
                'pickup_qty' => (int) PickupItem::query()->whereIn('work_order_item_id', $itemIds)->sum('qty'),
                'deliveries' => $deliveryIds->count(),
                'delivered_qty' => (int) SewingDelivery::query()->whereIn('id', $deliveryIds)->sum('qty'),
                'revisions' => $revisionIds->count(),
            ],
            'blockers' => $blockers,
        ];
    }

    public function execute(WorkOrder $workOrder, string $confirmNumber): void
    {
        if (trim($confirmNumber) !== $workOrder->number) {
            throw ValidationException::withMessages(['confirm_number' => "Ketik nomor WO \"{$workOrder->number}\" persis untuk konfirmasi."]);
        }

        DB::transaction(function () use ($workOrder) {
            $workOrder = WorkOrder::query()->lockForUpdate()->findOrFail($workOrder->id);
            $blockers = $this->preview($workOrder)['blockers'];

            if ($blockers !== []) {
                throw ValidationException::withMessages(['work_order' => $blockers[0]]);
            }

            $itemIds = $workOrder->items()->pluck('id');
            $pickupItems = PickupItem::query()->whereIn('work_order_item_id', $itemIds);
            $pickupIds = (clone $pickupItems)->pluck('pickup_id')->unique();
            $shipmentIds = SewingDelivery::query()->whereIn('work_order_item_id', $itemIds)->whereNotNull('qc_shipment_id')->pluck('qc_shipment_id')->unique();

            Revision::query()->whereIn('work_order_item_id', $itemIds)->delete();
            SewingDelivery::query()->whereIn('work_order_item_id', $itemIds)->delete();
            $pickupItems->delete();

            // Ambilan / kiriman QC yang isinya hanya dari WO ini ikut dihapus; yang campur WO lain tetap ada.
            Pickup::query()->whereIn('id', $pickupIds)->whereDoesntHave('items')->delete();
            QcShipment::query()->whereIn('id', $shipmentIds)->whereDoesntHave('deliveries')->delete();

            // Item, hancaan, dan cutting ikut terhapus lewat cascade.
            $workOrder->delete();
        });
    }
}
