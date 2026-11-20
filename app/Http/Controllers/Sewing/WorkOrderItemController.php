<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\ManageWorkOrderItemAction;
use App\Actions\Sewing\StepBackWorkOrderItemAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\WorkOrderItemRequest;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

    public function stepBack(Request $request, WorkOrderItem $item, StepBackWorkOrderItemAction $stepBack): RedirectResponse
    {
        $data = $request->validate([
            'to' => ['required', 'in:cutting,printing'],
            'qty' => ['required', 'integer', 'min:1', 'max:100000'],
        ]);

        $qty = $data['to'] === 'cutting'
            ? $stepBack->toCutting($item, (int) $data['qty'])
            : $stepBack->toPrinting($item, (int) $data['qty']);

        $label = $data['to'] === 'cutting' ? 'dari gudang kembali ke cutting' : 'dari cutting kembali ke printing';

        return Redirect::back()->with('status', "{$qty} pcs {$item->article->name} {$label}.");
    }
}
