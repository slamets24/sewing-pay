<?php

namespace App\Http\Controllers\Api;

use App\Actions\Sewing\CancelPackingWorkOrderAction;
use App\Actions\Sewing\ReceivePackingWorkOrderAction;
use App\Actions\Sewing\UpsertPackingWorkOrderAction;
use App\Enums\PickupItemStatus;
use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Presenters\PackingWorkOrderProgressPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Endpoint server-to-server untuk packingv2:
 * - packingv2 mengirim WO Produksi setiap kali dibuat atau berubah (nomor, qty, baris); OPSEW ikut menyamakan.
 * - packingv2 menghapus WO yang dinonaktifkan / dihapus (kalau belum mulai dikerjakan).
 * - packingv2 membaca progres produksi per WO.
 */
class PackingWorkOrderApiController extends Controller
{
    public function __construct(
        private readonly UpsertPackingWorkOrderAction $upsert,
        private readonly CancelPackingWorkOrderAction $cancel,
        private readonly PackingWorkOrderProgressPresenter $progress,
    ) {}

    /**
     * PUT /api/v1/packing/work-orders/{packingId}
     * Membuat WO kalau belum ada, atau menyamakan WO yang sudah ada dengan isi terbaru dari packingv2.
     */
    public function store(Request $request, int $packingId): JsonResponse
    {
        $validated = $request->validate(ReceivePackingWorkOrderAction::rules());

        $result = $this->upsert->execute([...$validated, 'packing_production_order_id' => $packingId]);
        $workOrder = $result['work_order'];

        return response()->json([
            'message' => $result['created'] ? 'WO diterima OPSEW.' : 'WO di OPSEW diperbarui.',
            'warnings' => $result['warnings'],
            'data' => [
                'sweing_pay_work_order_id' => $workOrder->id,
                'number' => $workOrder->number,
                'packing_production_order_id' => $workOrder->packing_production_order_id,
                'items_count' => $workOrder->items->count(),
            ],
        ], $result['created'] ? 201 : 200);
    }

    /**
     * DELETE /api/v1/packing/work-orders/{packingId}
     * WO dinonaktifkan / dihapus di packingv2. Ditolak (409) kalau sudah mulai dikerjakan.
     */
    public function destroy(int $packingId): JsonResponse
    {
        try {
            $deleted = $this->cancel->execute($packingId);
        } catch (ValidationException $exception) {
            return response()->json(['message' => collect($exception->errors())->flatten()->first()], 409);
        }

        return response()->json(['message' => $deleted ? 'WO dihapus dari OPSEW.' : 'WO tidak ada di OPSEW.', 'deleted' => $deleted]);
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
