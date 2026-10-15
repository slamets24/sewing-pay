<?php

namespace App\Services\Sewing;

use App\Models\Revision;
use App\Models\WorkOrderItem;

/** Frees pieces a tailor handed back for a material defect, so they can be taken from the warehouse again. */
class RevisionStockHold
{
    public function release(Revision $revision): void
    {
        if (! $revision->isHoldingStock()) {
            return;
        }

        $item = WorkOrderItem::query()->lockForUpdate()->findOrFail($revision->work_order_item_id);
        $item->revision_hold_qty = max(0, $item->revision_hold_qty - $revision->qty);
        $item->save();

        $revision->hold_released_at = now();
        $revision->save();
    }
}
