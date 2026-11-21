<?php

namespace App\Presenters;

use App\Models\CuttingReceipt;
use App\Models\HancaanReceipt;
use App\Models\PickupItem;
use App\Models\VendorJob;
use App\Models\VendorJobReturn;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;

/** Shapes work orders and their lines for the Inertia pages. Expects `items.article` / `items.variant` loaded. */
class WorkOrderPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(WorkOrder $workOrder): array
    {
        $items = $workOrder->items;

        return [
            'id' => $workOrder->id,
            'number' => $workOrder->number,
            'channel' => $workOrder->channel,
            'category' => $workOrder->category,
            'ordered_at' => $workOrder->ordered_at?->toDateString(),
            'due_at' => $workOrder->due_at?->toDateString(),
            'is_opening_stock' => $workOrder->is_opening_stock,
            'from_packing' => $workOrder->packing_production_order_id !== null,
            'is_overdue' => $workOrder->isOverdue(),
            'is_done' => $workOrder->isDone(),
            'notes' => $workOrder->notes,
            'items_count' => $items->count(),
            'article_names' => $items->map(fn (WorkOrderItem $item) => $item->article?->name)->filter()->unique()->values(),
            // Untuk laporan WA: per nama artikel (tanpa rincian warna/ukuran), berapa di gudang dan di penjahit.
            'article_lines' => $items
                ->groupBy('article_id')
                ->map(fn ($group) => [
                    'name' => $group->first()->article?->name ?? '-',
                    'processes' => $group->first()->article?->processNames() ?? [],
                    'qty' => (int) $group->sum('planned_qty'),
                    'warehouse_qty' => (int) $group->sum(fn (WorkOrderItem $item) => $item->availableQty()),
                    'sewing_qty' => (int) $group->sum(fn (WorkOrderItem $item) => $item->sewingQty()),
                ])
                ->values(),
            'planned_qty' => (int) $items->sum('planned_qty'),
            'printing_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->printingQty()),
            'cutting_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->cuttingPendingQty()),
            'pending_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->pendingQty()),
            'available_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->availableQty()),
            'vendor_waiting_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->vendorWaitingQty()),
            'vendor_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->vendorQty()),
            'sewing_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->sewingQty()),
            'sewing_internal_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->internalSewingQty()),
            'sewing_makloon_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->makloonSewingQty()),
            'hold_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->holdQty()),
            'delivered_qty' => (int) $items->sum('delivered_qty'),
            'qc_qty' => (int) $items->sum(fn (WorkOrderItem $item) => $item->qcShippedQty()),
            'can_delete' => ! $workOrder->hasReceivedAnything(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(WorkOrder $workOrder): array
    {
        return [
            ...$this->summary($workOrder),
            'source_text' => $workOrder->source_text,
            'items' => $workOrder->items
                ->sortBy([['article.name', 'asc'], ['color', 'asc'], ['variant.size_sort', 'asc']])
                ->values()
                ->map(fn (WorkOrderItem $item) => $this->item($item)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function item(WorkOrderItem $item): array
    {
        $stage = $item->stage();

        return [
            'id' => $item->id,
            'work_order_id' => $item->work_order_id,
            'work_order_number' => $item->relationLoaded('workOrder') ? $item->workOrder->number : null,
            'due_at' => $item->relationLoaded('workOrder') ? $item->workOrder->due_at?->toDateString() : null,
            'article_id' => $item->article_id,
            'article_name' => $item->article->name,
            'color' => $item->color,
            'size' => $item->size,
            'item_type' => $item->item_type ?? 'print',
            // Proses di vendor setelah cutting (Bordir, Prisket, ...), urut pengerjaan.
            'processes' => $item->article->processNames(),
            'is_polosan' => $item->isPolosan(),
            'barcode_value' => $item->variant?->barcode_value,
            'sewing_rate' => $item->article->sewing_rate,
            'planned_qty' => $item->planned_qty,
            'cutting_transferred_qty' => $item->cutting_qty,
            'min_planned_qty' => $item->minimumPlannedQty(),
            'printing_qty' => $item->printingQty(),
            'cutting_qty' => $item->cuttingPendingQty(),
            'received_qty' => $item->received_qty,
            'assigned_qty' => $item->assigned_qty,
            'delivered_qty' => $item->delivered_qty,
            'qc_qty' => $item->qcShippedQty(),
            'pending_qty' => $item->pendingQty(),
            'available_qty' => $item->availableQty(),
            // Gudang → cutting hanya untuk hancaan yang belum keluar ke vendor / penjahit.
            'step_back_warehouse_qty' => max(0, $item->received_qty - $item->lockedReceivedQty()),
            'vendor_waiting_qty' => $item->vendorWaitingQty(),
            'vendor_qty' => $item->vendorQty(),
            'vendor_steps' => $item->vendorSteps(),
            'open_vendor_jobs' => $item->hasProcesses()
                ? $item->vendorJobs
                    ->filter(fn (VendorJob $job) => $job->isOpen())
                    ->map(fn (VendorJob $job) => [
                        'id' => $job->id,
                        'process' => $job->process,
                        'vendor_name' => $job->vendor_name,
                        'qty' => $job->qty,
                        'open_qty' => $job->openQty(),
                        'sent_at' => $job->sent_at->format('Y-m-d H:i'),
                    ])
                    ->values()
                : [],
            'sewing_qty' => $item->sewingQty(),
            'sewing_internal_qty' => $item->internalSewingQty(),
            'sewing_makloon_qty' => $item->makloonSewingQty(),
            'hold_qty' => $item->holdQty(),
            'stage' => $stage->value,
            'stage_label' => $stage->label(),
            'can_delete' => $item->received_qty === 0 && ($item->isPolosan() || $item->cutting_qty === 0),
            // Ambilan yang masih di penjahit, untuk "Mundurkan" (penjahit → gudang).
            'pickups' => $item->relationLoaded('pickupItems')
                ? $item->pickupItems
                    ->filter(fn (PickupItem $pickup) => $pickup->isOpen())
                    ->map(fn (PickupItem $pickup) => [
                        'id' => $pickup->id,
                        'tailor_name' => $pickup->tailor?->name,
                        'qty' => $pickup->qty,
                        'delivered_qty' => $pickup->delivered_qty,
                        'can_cancel' => $pickup->isCancellable(),
                    ])
                    ->values()
                : [],
        ];
    }

    /**
     * Satu kiriman vendor untuk riwayat di halaman WO. Expects `item.article`, `returns.creator`, `creator` loaded.
     *
     * @return array<string, mixed>
     */
    public function vendorJob(VendorJob $job): array
    {
        return [
            'id' => $job->id,
            'work_order_item_id' => $job->work_order_item_id,
            'article_name' => $job->item->article->name,
            'color' => $job->item->color,
            'size' => $job->item->size,
            'process' => $job->process,
            'vendor_name' => $job->vendor_name,
            'qty' => $job->qty,
            'returned_qty' => $job->returned_qty,
            'open_qty' => $job->openQty(),
            'sent_at' => $job->sent_at->format('Y-m-d H:i'),
            'notes' => $job->notes,
            'created_by_name' => $job->creator?->name,
            'can_cancel' => $job->returned_qty === 0,
            'returns' => $job->returns
                ->sortByDesc('id')
                ->map(fn (VendorJobReturn $return) => [
                    'id' => $return->id,
                    'qty' => $return->qty,
                    'returned_at' => $return->returned_at->format('Y-m-d H:i'),
                    'created_by_name' => $return->creator?->name,
                ])
                ->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function cuttingReceipt(CuttingReceipt $receipt): array
    {
        return [
            'id' => $receipt->id,
            'work_order_item_id' => $receipt->work_order_item_id,
            'article_name' => $receipt->item->article->name,
            'color' => $receipt->item->color,
            'size' => $receipt->item->size,
            'qty' => $receipt->qty,
            'transferred_at' => $receipt->transferred_at->format('Y-m-d H:i'),
            'notes' => $receipt->notes,
            'created_by_name' => $receipt->creator?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function receipt(HancaanReceipt $receipt): array
    {
        return [
            'id' => $receipt->id,
            'work_order_item_id' => $receipt->work_order_item_id,
            'article_name' => $receipt->item->article->name,
            'color' => $receipt->item->color,
            'size' => $receipt->item->size,
            'qty' => $receipt->qty,
            'received_at' => $receipt->received_at->format('Y-m-d H:i'),
            'notes' => $receipt->notes,
            'created_by_name' => $receipt->creator?->name,
        ];
    }
}
