<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Starts a pay run on any date. Only one draft may exist so the same work is never on two drafts. */
class CreatePayoutAction
{
    /**
     * Catatan HR dari perhitungan terakhir (absensi/kasbon tidak terbaca).
     *
     * @return list<string>
     */
    public function warnings(): array
    {
        return $this->generate->warnings;
    }

    public function __construct(private readonly GeneratePayoutAction $generate) {}

    public function execute(string $cutoffDate, ?string $notes = null, ?int $createdBy = null): Payout
    {
        $outstandingKasbons = $this->generate->prepareFromHr(Carbon::parse($cutoffDate));

        return DB::transaction(function () use ($cutoffDate, $notes, $createdBy, $outstandingKasbons) {
            if (Payout::query()->where('status', PayoutStatus::Draft->value)->lockForUpdate()->exists()) {
                throw ValidationException::withMessages(['cutoff_date' => 'Masih ada draft pencairan. Selesaikan atau hapus dulu.']);
            }

            $cutoff = Carbon::parse($cutoffDate);

            $payout = Payout::create([
                'code' => $this->uniqueCode($cutoff),
                'cutoff_date' => $cutoff->toDateString(),
                'status' => PayoutStatus::Draft,
                'notes' => $notes,
                'created_by' => $createdBy,
            ]);

            return $this->generate->execute($payout, $outstandingKasbons);
        });
    }

    private function uniqueCode(Carbon $cutoff): string
    {
        $base = 'GJ-'.$cutoff->format('Ymd');
        $code = $base;
        $suffix = 2;

        while (Payout::query()->where('code', $code)->exists()) {
            $code = "{$base}-{$suffix}";
            $suffix++;
        }

        return $code;
    }
}
