<?php

namespace App\Actions\Sewing;

use App\Services\Sewing\PackingWorkOrderClient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Throwable;

/**
 * Menarik WO Produksi dari packingv2 dan membuat yang belum ada di OPSEW.
 * WO yang sudah ada tidak diubah (sama seperti kiriman otomatis dari packingv2).
 */
class PullPackingWorkOrdersAction
{
    public function __construct(
        private readonly PackingWorkOrderClient $client,
        private readonly ReceivePackingWorkOrderAction $receive,
    ) {}

    /**
     * @return array{created: list<string>, existing: int, skipped: list<string>}
     */
    public function execute(int $days = 30): array
    {
        $created = [];
        $existing = 0;
        $skipped = [];

        foreach ($this->client->recent($days) as $order) {
            $packingId = (int) ($order['packing_production_order_id'] ?? 0);
            $label = (string) ($order['number'] ?? "#{$packingId}");

            if ($packingId <= 0 || empty($order['items'])) {
                $skipped[] = $label;

                continue;
            }

            $validator = Validator::make($order, ReceivePackingWorkOrderAction::rules());

            if ($validator->fails()) {
                Log::warning('Tarik WO packing: data tidak valid', ['packing_id' => $packingId, 'errors' => $validator->errors()->all()]);
                $skipped[] = $label;

                continue;
            }

            try {
                $result = $this->receive->execute([...$validator->validated(), 'packing_production_order_id' => $packingId]);
            } catch (Throwable $exception) {
                Log::warning('Tarik WO packing gagal', ['packing_id' => $packingId, 'error' => $exception->getMessage()]);
                $skipped[] = $label;

                continue;
            }

            if ($result['created']) {
                $created[] = $result['work_order']->number;
            } else {
                $existing++;
            }
        }

        return ['created' => $created, 'existing' => $existing, 'skipped' => $skipped];
    }
}
