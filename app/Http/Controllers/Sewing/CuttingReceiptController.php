<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\TransferToCuttingAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreCuttingReceiptRequest;
use App\Models\CuttingReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class CuttingReceiptController extends Controller
{
    public function __construct(private readonly TransferToCuttingAction $transfer) {}

    public function store(StoreCuttingReceiptRequest $request, WorkOrderItem $item): RedirectResponse
    {
        $data = $request->validated();
        $receipt = $this->transfer->transfer($item, (int) $data['qty'], $data['transferred_at'] ?? null, $data['notes'] ?? null, $request->user()->id);

        return Redirect::back()
            ->with('status', "{$receipt->qty} pcs kain dikirim ke cutting.")
            ->with('undo', ['url' => route('cutting-receipts.destroy', $receipt), 'method' => 'delete']);
    }

    public function transferAll(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $total = $this->transfer->transferAllPending($workOrder, $request->user()->id);

        return Redirect::back()->with('status', "{$total} pcs kain print WO {$workOrder->number} dikirim ke cutting.");
    }

    public function transferBatch(Request $request, WorkOrder $workOrder): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.work_order_item_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'transferred_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $total = $this->transfer->transferBatch($validated['items'], $validated['transferred_at'] ?? null, $validated['notes'] ?? null, $request->user()->id);

        return Redirect::back()->with('status', "{$total} pcs kain berhasil dikirim ke cutting.");
    }

    public function update(StoreCuttingReceiptRequest $request, CuttingReceipt $receipt): RedirectResponse
    {
        $this->transfer->updateQty($receipt, (int) $request->validated('qty'));

        return Redirect::back()->with('status', 'Qty kirim ke cutting diperbarui.');
    }

    public function destroy(CuttingReceipt $receipt): RedirectResponse
    {
        $this->transfer->undo($receipt);

        return Redirect::back()->with('status', 'Catatan kirim ke cutting dibatalkan.');
    }
}
