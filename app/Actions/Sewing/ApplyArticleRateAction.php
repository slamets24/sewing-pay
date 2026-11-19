<?php

namespace App\Actions\Sewing;

use App\Enums\PickupItemStatus;
use App\Enums\TailorType;
use App\Models\Article;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\PickupItem;
use App\Models\SewingDelivery;
use Illuminate\Support\Facades\DB;

/**
 * After the owner changes an article's rate, carries it over to work that is not paid yet.
 *
 * The rate is copied onto a pickup when a tailor takes the goods, so without this a rate filled in later
 * (typically a packingv2 article that arrived at Rp0) never reached the pay run.
 *
 * Only rows still following the article are touched (the old rate, or Rp0 because no rate was set yet):
 * a custom rate the owner typed at pickup stays.
 * Paid work never changes: deliveries on a paid slip or in a makloon payment are skipped. Deliveries already on
 * a draft slip are updated there too, so the draft shows the new amount without recalculating by hand.
 */
class ApplyArticleRateAction
{
    /**
     * @return int Pieces (setoran + barang yang masih dipegang) moved to the new rate.
     */
    public function execute(Article $article, int $oldInternalRate, int $oldMakloonRate): int
    {
        $newRate = fn (TailorType $type) => $type === TailorType::Makloon ? $article->makloonRate() : (int) $article->sewing_rate;
        $oldRate = fn (TailorType $type) => $type === TailorType::Makloon ? $oldMakloonRate : $oldInternalRate;

        // A row follows the article rate when it still has the old rate, or Rp0 (rate was never filled in).
        $follows = fn (int $rowRate, TailorType $type) => $rowRate !== $newRate($type) && ($rowRate === $oldRate($type) || $rowRate === 0);

        return DB::transaction(function () use ($article, $newRate, $follows) {
            $pieces = 0;
            $touchedSlipIds = [];

            // Goods tailors still hold: future setoran will use this rate.
            PickupItem::query()
                ->with('tailor')
                ->where('status', PickupItemStatus::Open->value)
                ->whereHas('workOrderItem', fn ($query) => $query->where('article_id', $article->id))
                ->lockForUpdate()
                ->get()
                ->each(function (PickupItem $pickupItem) use ($newRate, $follows, &$pieces) {
                    $type = $pickupItem->tailor->type;
                    if (! $follows($pickupItem->sewing_rate, $type)) {
                        return;
                    }
                    $pickupItem->forceFill(['sewing_rate' => $newRate($type)])->save();
                    $pieces += $pickupItem->remainingQty();
                });

            // Setoran not paid yet.
            SewingDelivery::query()
                ->with(['tailor', 'slipLine.slip', 'pickupItem'])
                ->whereHas('workOrderItem', fn ($query) => $query->where('article_id', $article->id))
                ->whereDoesntHave('makloonPaymentLine')
                ->lockForUpdate()
                ->get()
                ->each(function (SewingDelivery $delivery) use ($newRate, $follows, &$pieces, &$touchedSlipIds) {
                    $type = $delivery->tailor->type;
                    $slip = $delivery->slipLine?->slip;

                    if ($slip?->isPaid() || ! $follows($delivery->sewing_rate, $type)) {
                        return;
                    }

                    $rate = $newRate($type);
                    $delivery->forceFill(['sewing_rate' => $rate, 'subtotal' => $rate * $delivery->qty])->save();

                    // Keep the finished pickup in line with its setoran (open ones were handled above).
                    if ($delivery->pickupItem && $delivery->pickupItem->sewing_rate !== $rate && $delivery->pickupItem->status !== PickupItemStatus::Open) {
                        $delivery->pickupItem->forceFill(['sewing_rate' => $rate])->save();
                    }

                    if ($slip) {
                        $delivery->slipLine->forceFill(['rate' => $rate, 'subtotal' => $rate * $delivery->qty])->save();
                        $touchedSlipIds[$slip->id] = true;
                    }

                    $pieces += $delivery->qty;
                });

            $this->refreshDraftSlips(array_keys($touchedSlipIds));

            return $pieces;
        });
    }

    /**
     * @param  list<int>  $slipIds
     */
    private function refreshDraftSlips(array $slipIds): void
    {
        $payoutIds = [];

        foreach (PayoutSlip::query()->whereKey($slipIds)->lockForUpdate()->get() as $slip) {
            $gross = (int) $slip->lines()->sum('subtotal');
            $deduction = min($slip->deduction_amount, $gross + $slip->bonus_amount);
            $slip->forceFill([
                'gross_amount' => $gross,
                'deduction_amount' => $deduction,
                'net_amount' => $gross + $slip->bonus_amount - $deduction,
            ])->save();
            $payoutIds[$slip->payout_id] = true;
        }

        foreach (Payout::query()->whereKey(array_keys($payoutIds))->lockForUpdate()->get() as $payout) {
            $payout->forceFill(['total_amount' => (int) $payout->slips()->sum('net_amount')])->save();
        }
    }
}
