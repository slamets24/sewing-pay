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

    public function destroy(HancaanReceipt $receipt): RedirectResponse
    {
        $this->receive->undo($receipt);

        return Redirect::back()->with('status', 'Catatan hancaan masuk dibatalkan.');
    }
}
