<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CreateWorkOrderAction;
use App\Actions\Sewing\DeleteWorkOrderAction;
use App\Actions\Sewing\PurgeWorkOrderAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreWorkOrderRequest;
use App\Http\Requests\Sewing\UpdateWorkOrderRequest;
use App\Models\CuttingReceipt;
use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Presenters\WorkOrderPresenter;
use App\Services\Sewing\ArticleCatalog;
use App\Services\Sewing\PackingWorkOrderClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class WorkOrderController extends Controller
{
    public function __construct(private readonly WorkOrderPresenter $presenter) {}

    public function index(Request $request, PackingWorkOrderClient $packing): Response
    {
        $status = in_array($request->query('status'), ['open', 'done', 'all'], true) ? $request->query('status') : 'open';
        $search = trim((string) $request->query('search'));

        $workOrders = WorkOrder::query()
            ->with(['items' => fn ($query) => WorkOrderItem::withQcShippedQty($query), 'items.article', 'items.pickupItems.tailor'])
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('number', 'like', "%{$search}%")
                ->orWhereHas('items.article', fn ($query) => $query->where('name', 'like', "%{$search}%"))))
            ->latest('ordered_at')
            ->latest('id')
            ->limit(300)
            ->get()
            ->filter(fn (WorkOrder $workOrder) => match ($status) {
                'open' => ! $workOrder->isDone(),
                'done' => $workOrder->isDone(),
                default => true,
            })
            ->values();

        return Inertia::render('WorkOrders/Index', [
            'filters' => ['status' => $status, 'search' => $search],
            'packingConfigured' => $packing->isConfigured(),
            'workOrders' => $workOrders->map(fn (WorkOrder $workOrder) => $this->presenter->summary($workOrder)),
        ]);
    }

    public function create(ArticleCatalog $catalog): Response
    {
        return Inertia::render('WorkOrders/Create', $catalog->forPicker());
    }

    public function store(StoreWorkOrderRequest $request, CreateWorkOrderAction $createWorkOrder): RedirectResponse
    {
        $workOrder = $createWorkOrder->execute($request->validated(), $request->user()->id);

        return Redirect::route('work-orders.show', $workOrder)
            ->with('status', "WO {$workOrder->number} disimpan ({$workOrder->plannedQty()} pcs).");
    }

    public function show(Request $request, WorkOrder $workOrder, ArticleCatalog $catalog, PurgeWorkOrderAction $purge): Response
    {
        $workOrder->load(['items' => fn ($query) => WorkOrderItem::withQcShippedQty($query), 'items.article', 'items.variant', 'items.pickupItems.tailor']);

        $receipts = HancaanReceipt::query()
            ->with(['item.article', 'creator'])
            ->whereIn('work_order_item_id', $workOrder->items->modelKeys())
            ->latest('received_at')
            ->latest('id')
            ->limit(50)
            ->get();

        $cuttingReceipts = CuttingReceipt::query()
            ->with(['item.article', 'creator'])
            ->whereIn('work_order_item_id', $workOrder->items->modelKeys())
            ->latest('transferred_at')
            ->latest('id')
            ->limit(50)
            ->get();

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => $this->presenter->detail($workOrder),
            'receipts' => $receipts->map(fn (HancaanReceipt $receipt) => $this->presenter->receipt($receipt)),
            'cuttingReceipts' => $cuttingReceipts->map(fn (CuttingReceipt $receipt) => $this->presenter->cuttingReceipt($receipt)),
            // Hanya Owner yang boleh "hapus total" WO yang sudah berjalan.
            'purge' => $request->user()?->role === UserRole::Superadmin && $workOrder->hasReceivedAnything()
                ? $purge->preview($workOrder)
                : null,
            ...$catalog->forPicker(),
        ]);
    }

    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder): RedirectResponse
    {
        $workOrder->update($request->validated());

        return Redirect::back()->with('status', 'Data WO diperbarui.');
    }

    public function destroy(WorkOrder $workOrder, DeleteWorkOrderAction $deleteWorkOrder): RedirectResponse
    {
        $deleteWorkOrder->execute($workOrder);

        return Redirect::route('work-orders.index')->with('status', "WO {$workOrder->number} dihapus.");
    }

    public function purge(Request $request, WorkOrder $workOrder, PurgeWorkOrderAction $purge): RedirectResponse
    {
        $confirm = (string) $request->validate(['confirm_number' => ['required', 'string']])['confirm_number'];

        $purge->execute($workOrder, $confirm);

        $message = "WO {$workOrder->number} dihapus total beserta semua riwayatnya.";
        if ($workOrder->packing_production_order_id !== null) {
            $message .= ' WO ini dari Packing: klik "Tarik dari Packing" kalau ingin memasukkannya lagi dari awal.';
        }

        return Redirect::route('work-orders.index')->with('status', $message);
    }
}
