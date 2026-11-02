<?php

namespace App\Actions\Sewing;

use App\Enums\TailorType;
use App\Models\MakloonPayment;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateMakloonPaymentAction
{
    /**
     * @param  array{tailor_id: int, delivery_ids: list<int>, payment_date?: ?string, adjustment_amount?: ?int, payment_method?: ?string, notes?: ?string}  $data
     */
    public function execute(array $data, ?int $createdBy = null): MakloonPayment
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $tailor = Tailor::query()->lockForUpdate()->findOrFail($data['tailor_id']);

            if ($tailor->type !== TailorType::Makloon) {
                throw ValidationException::withMessages([
                    'tailor_id' => 'Pembayaran ini hanya untuk penjahit tipe Maklun.',
                ]);
            }

            $deliveryIds = array_unique($data['delivery_ids'] ?? []);

            $deliveries = SewingDelivery::query()
                ->with(['workOrderItem.article', 'workOrderItem.workOrder'])
                ->where('tailor_id', $tailor->id)
                ->whereIn('id', $deliveryIds)
                ->whereDoesntHave('makloonPaymentLine')
                ->lockForUpdate()
                ->get();

            if ($deliveries->isEmpty()) {
                throw ValidationException::withMessages([
                    'delivery_ids' => 'Pilih minimal satu setoran yang belum dibayar.',
                ]);
            }

            $totalQty = (int) $deliveries->sum('qty');
            $grossAmount = (int) $deliveries->sum('subtotal');
            $adjustment = (int) ($data['adjustment_amount'] ?? 0);
            $netAmount = max(0, $grossAmount + $adjustment);

            $paymentDate = isset($data['payment_date']) ? Carbon::parse($data['payment_date']) : today();
            $code = $this->generateCode($paymentDate);

            $payment = MakloonPayment::create([
                'code' => $code,
                'tailor_id' => $tailor->id,
                'payment_date' => $paymentDate,
                'paid_at' => now(),
                'status' => 'paid',
                'total_qty' => $totalQty,
                'gross_amount' => $grossAmount,
                'adjustment_amount' => $adjustment,
                'net_amount' => $netAmount,
                'payment_method' => $data['payment_method'] ?? 'transfer',
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy,
            ]);

            foreach ($deliveries as $delivery) {
                $item = $delivery->workOrderItem;
                $article = $item?->article;

                $payment->lines()->create([
                    'sewing_delivery_id' => $delivery->id,
                    'work_order_item_id' => $delivery->work_order_item_id,
                    'description' => $article ? $article->name : 'Jahitan',
                    'wo_number' => $item?->workOrder?->number,
                    'color' => $item?->color,
                    'size' => $item?->size,
                    'qty' => $delivery->qty,
                    'rate' => $delivery->sewing_rate,
                    'subtotal' => $delivery->subtotal,
                    'delivered_at' => $delivery->delivered_at,
                ]);
            }

            return $payment->load(['tailor', 'lines', 'creator']);
        });
    }

    private function generateCode(Carbon $date): string
    {
        $prefix = 'MKL-'.$date->format('ym').'-';
        $latest = MakloonPayment::query()
            ->where('code', 'like', $prefix.'%')
            ->orderByDesc('code')
            ->value('code');

        $nextNumber = 1;
        if ($latest && preg_match('/-(\d+)$/', $latest, $matches)) {
            $nextNumber = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
