<?php

namespace App\Http\Controllers\Api;

use App\Actions\Sewing\ReceivePackingWorkOrderAction;
use App\Enums\PickupItemStatus;
use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Presenters\PackingWorkOrderProgressPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint server-to-server untuk packingv2:
 * - packingv2 mengirim WO Produksi baru (sekali, otomatis saat WO dibuat).
 * - packingv2 membaca progres produksi per WO.
 *
 * Setelah WO masuk, WO dikelola penuh di sweing-pay; packingv2 tidak mengubah atau menghapusnya.
 */
class PackingWorkOrderApiController extends Controller
{
    public function __construct(
        private readonly ReceivePackingWorkOrderAction $receive,
        private readonly PackingWorkOrderProgressPresenter $progress,
    ) {}

    /**
     * PUT /api/v1/packing/work-orders/{packingId}
     * Membuat WO kalau belum ada. Kalau sudah ada, WO tidak diubah dan datanya dikembalikan.
     */
    public function store(Request $request, int $packingId): JsonResponse
    {
        $validated = $request->validate(ReceivePackingWorkOrderAction::rules());

        $result = $this->receive->execute([...$validated, 'packing_production_order_id' => $packingId]);
        $workOrder = $result['work_order'];

        return response()->json([
            'message' => $result['created'] ? 'WO diterima OPSEW.' : 'WO sudah ada di OPSEW, tidak diubah.',
            'data' => [
                'sweing_pay_work_order_id' => $workOrder->id,
                'number' => $workOrder->number,
                'packing_production_order_id' => $workOrder->packing_production_order_id,
                'items_count' => $workOrder->items->count(),
            ],
        ], $result['created'] ? 201 : 200);
    }

    /**
     * GET /api/v1/packing/work-orders/progress?ids=1,2,3
     * Ringkasan progres beberapa WO sekaligus (untuk Daftar WO di packingv2).
     */
    public function summaries(Request $request): JsonResponse
    {
        $ids = collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn (string $id) => (int) trim($id))
            ->filter(fn (int $id) => $id > 0)
            ->unique()
            ->take(100)
            ->values();

        if ($ids->isEmpty()) {
            return response()->json(['data' => (object) []]);
        }

        $data = $this->progressQuery()
            ->whereIn('packing_production_order_id', $ids)
            ->get()
            ->mapWithKeys(fn (WorkOrder $workOrder) => [
                (string) $workOrder->packing_production_order_id => $this->progress->summary($workOrder),
            ]);

        return response()->json(['data' => $data->isEmpty() ? (object) [] : $data]);
    }

    /**
     * GET /api/v1/packing/work-orders/{packingId}/progress
     * Progres per baris artikel × warna × size (untuk detail WO di packingv2).
     */
    public function show(int $packingId): JsonResponse
    {
        $workOrder = $this->progressQuery()
            ->with('items.article')
            ->where('packing_production_order_id', $packingId)
            ->first();

        if (! $workOrder) {
            return response()->json(['message' => 'WO belum ada di OPSEW.'], 404);
        }

        return response()->json(['data' => $this->progress->detail($workOrder)]);
    }

    /**
     * @return Builder<WorkOrder>
     */
    private function progressQuery(): Builder
    {
        return WorkOrder::query()->with([
            'items' => fn ($query) => WorkOrderItem::withQcShippedQty($query)->orderBy('id'),
            // Ambilan yang belum disetor, untuk tahu barang ada di penjahit internal atau vendor makloon.
            'items.pickupItems' => fn ($query) => $query->where('status', PickupItemStatus::Open->value)->with('tailor:id,name,type'),
        ]);
    }
}
