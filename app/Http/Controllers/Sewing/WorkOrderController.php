<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CreateWorkOrderAction;
use App\Actions\Sewing\DeleteWorkOrderAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreWorkOrderRequest;
use App\Http\Requests\Sewing\UpdateWorkOrderRequest;
use App\Models\HancaanReceipt;
use App\Models\WorkOrder;
use App\Presenters\WorkOrderPresenter;
use App\Services\Sewing\ArticleCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class WorkOrderController extends Controller
{
    public function __construct(private readonly WorkOrderPresenter $presenter) {}

    public function index(Request $request): Response
    {
        $status = in_array($request->query('status'), ['open', 'done', 'all'], true) ? $request->query('status') : 'open';
        $search = trim((string) $request->query('search'));

        $workOrders = WorkOrder::query()
            ->with(['items.article'])
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

    public function show(WorkOrder $workOrder, ArticleCatalog $catalog): Response
    {
        $workOrder->load(['items.article', 'items.variant']);

        $receipts = HancaanReceipt::query()
            ->with(['item.article', 'creator'])
            ->whereIn('work_order_item_id', $workOrder->items->modelKeys())
            ->latest('received_at')
            ->latest('id')
            ->limit(50)
            ->get();

        return Inertia::render('WorkOrders/Show', [
            'workOrder' => $this->presenter->detail($workOrder),
            'receipts' => $receipts->map(fn (HancaanReceipt $receipt) => $this->presenter->receipt($receipt)),
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
}
