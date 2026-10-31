<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\ReceiveHancaanAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreHancaanReceiptRequest;
use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class HancaanReceiptController extends Controller
{
    public function __construct(private readonly ReceiveHancaanAction $receive) {}

    public function store(StoreHancaanReceiptRequest $request, WorkOrderItem $item): RedirectResponse
    {
        $data = $request->validated();
        $receipt = $this->receive->receive($item, (int) $data['qty'], $data['received_at'] ?? null, $data['notes'] ?? null, $request->user()->id);

        return Redirect::back()
            ->with('status', "{$receipt->qty} pcs hancaan masuk gudang.")
            ->with('undo', ['url' => route('hancaan-receipts.destroy', $receipt), 'method' => 'delete']);
    }

    public function receiveAll(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $total = $this->receive->receiveAllPending($workOrder, $request->user()->id);

        return Redirect::back()->with('status', "{$total} pcs hancaan WO {$workOrder->number} masuk gudang.");
    }

    public function receiveBatch(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.work_order_item_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'received_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $total = $this->receive->receiveBatch($validated['items'], $validated['received_at'] ?? null, $validated['notes'] ?? null, $request->user()->id);

        return Redirect::back()->with('status', "{$total} pcs hancaan berhasil masuk ke gudang.");
    }

    public function update(StoreHancaanReceiptRequest $request, HancaanReceipt $receipt): RedirectResponse
    {
        $this->receive->updateQty($receipt, (int) $request->validated('qty'));

        return Redirect::back()->with('status', 'Qty hancaan masuk diperbarui.');
    }

    public function destroy(HancaanReceipt $receipt): RedirectResponse
    {
        $this->receive->undo($receipt);

        return Redirect::back()->with('status', 'Catatan hancaan masuk dibatalkan.');
    }
}
