<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\ReceiveFromVendorAction;
use App\Actions\Sewing\SendToVendorAction;
use App\Http\Controllers\Controller;
use App\Models\VendorJob;
use App\Models\VendorJobReturn;
use App\Models\WorkOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

/** Hancaan keluar gudang ke vendor proses (Bordir, Prisket, ...) dan masuk gudang lagi. */
class VendorJobController extends Controller
{
    public function send(Request $request, WorkOrder $workOrder, SendToVendorAction $send): RedirectResponse
    {
        $validated = $request->validate([
            'process' => ['required', 'string', 'max:60'],
            'vendor_name' => ['required', 'string', 'max:120'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.work_order_item_id' => ['required', 'integer', 'distinct', Rule::exists('work_order_items', 'id')->where('work_order_id', $workOrder->id)],
            'items.*.qty' => ['required', 'integer', 'min:0', 'max:100000'],
            'sent_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [
            'process.required' => 'Pilih proses yang dikerjakan vendor.',
            'vendor_name.required' => 'Isi nama vendor.',
        ]);

        $total = $send->execute(
            $validated['items'],
            $validated['process'],
            $validated['vendor_name'],
            $validated['sent_at'] ?? null,
            $validated['notes'] ?? null,
            $request->user()->id,
        );

        return Redirect::back()->with('status', "{$total} pcs keluar gudang ke {$validated['vendor_name']} untuk {$validated['process']}.");
    }

    public function receive(Request $request, WorkOrder $workOrder, ReceiveFromVendorAction $receive): RedirectResponse
    {
        $itemIds = $workOrder->items()->pluck('id');

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.vendor_job_id' => ['required', 'integer', 'distinct', Rule::exists('vendor_jobs', 'id')->whereIn('work_order_item_id', $itemIds->all())],
            'items.*.qty' => ['required', 'integer', 'min:0', 'max:100000'],
            'returned_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $total = $receive->execute($validated['items'], $validated['returned_at'] ?? null, $validated['notes'] ?? null, $request->user()->id);

        return Redirect::back()->with('status', "{$total} pcs dari vendor masuk gudang.");
    }

    public function destroy(VendorJob $vendorJob, SendToVendorAction $send): RedirectResponse
    {
        $send->cancel($vendorJob);

        return Redirect::back()->with('status', 'Kiriman ke vendor dibatalkan.');
    }

    public function undoReturn(VendorJobReturn $vendorJobReturn, ReceiveFromVendorAction $receive): RedirectResponse
    {
        $receive->undo($vendorJobReturn);

        return Redirect::back()->with('status', 'Penerimaan dari vendor dibatalkan.');
    }
}
