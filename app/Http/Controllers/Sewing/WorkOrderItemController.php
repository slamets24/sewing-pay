<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\ManageWorkOrderItemAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\WorkOrderItemRequest;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class WorkOrderItemController extends Controller
{
    public function __construct(private readonly ManageWorkOrderItemAction $items) {}

    public function store(WorkOrderItemRequest $request, WorkOrder $workOrder): RedirectResponse
    {
        $this->items->add($workOrder, $request->validated());

        return Redirect::back()->with('status', 'Baris artikel ditambahkan.');
    }

    public function update(WorkOrderItemRequest $request, WorkOrderItem $item): RedirectResponse
    {
        $this->items->updatePlannedQty($item, (int) $request->validated('planned_qty'));

        return Redirect::back()->with('status', 'Qty rencana diperbarui.');
    }

    public function destroy(WorkOrderItem $item): RedirectResponse
    {
        $this->items->remove($item);

        return Redirect::back()->with('status', 'Baris artikel dihapus.');
    }
}
