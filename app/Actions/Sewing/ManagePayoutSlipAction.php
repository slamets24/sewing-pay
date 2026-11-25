<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Services\Sewing\HrAzzahraClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/** Bonus, potongan, kasbon warung/mingguan edits and paying slips; the pay run closes when its last slip is paid. */
class ManagePayoutSlipAction
{
    public function __construct(private readonly HrAzzahraClient $hr) {}

    /**
     * @param  array{bonus_amount: int, deduction_amount: int, kasbon_warung_amount?: int, kasbon_mingguan_amount?: int, notes?: ?string}  $data
     */
    public function adjust(PayoutSlip $slip, array $data): PayoutSlip
    {
        return DB::transaction(function () use ($slip, $data) {
            $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

            if ($slip->isPaid()) {
                throw ValidationException::withMessages(['payout_slip' => 'Slip yang sudah dibayar tidak bisa diubah.']);
            }

            if ($slip->payout()->first()?->isLockedByHr()) {
                throw ValidationException::withMessages(['payout_slip' => 'Pencairan ini sedang/sudah di-acc HR. Perubahan bonus/kasbon/potongan dilakukan di HR.']);
            }

            $kasbonWarung = (int) ($data['kasbon_warung_amount'] ?? 0);
            $kasbonMingguan = (int) ($data['kasbon_mingguan_amount'] ?? 0);
            $net = $slip->gross_amount + (int) $data['bonus_amount'] - (int) $data['deduction_amount'] - $kasbonWarung - $kasbonMingguan;

            if ($net < 0) {
                throw ValidationException::withMessages(['deduction_amount' => 'Potongan dan kasbon tidak boleh melebihi gaji kotor ditambah bonus.']);
            }

            $slip->forceFill([
                'bonus_amount' => (int) $data['bonus_amount'],
                'deduction_amount' => (int) $data['deduction_amount'],
                'kasbon_warung_amount' => $kasbonWarung,
                'kasbon_mingguan_amount' => $kasbonMingguan,
                'net_amount' => $net,
                'notes' => $data['notes'] ?? null,
            ])->save();

            $this->refreshTotals($slip->payout_id);

            return $slip;
        });
    }

    /**
     * Tandai slip dibayar, lalu kabari HR (kalau pencairan ini lewat acc HR). Gagal mengabari HR tidak membatalkan pembayaran.
     */
    public function markPaid(PayoutSlip $slip): PayoutSlip
    {
        $slip = DB::transaction(fn (): PayoutSlip => $this->markPaidInDatabase($slip));
        $this->reportPaidToHr($slip->payout_id);

        return $slip;
    }

    public function markAllPaid(Payout $payout): void
    {
        DB::transaction(function () use ($payout) {
            if ($payout->slips()->doesntExist()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan ini belum punya slip.']);
            }

            if (! $payout->canBePaid()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan ini baru bisa dibayar setelah di-acc HR.']);
            }

            $payout->slips()->where('status', '!=', PayoutStatus::Paid->value)->get()->each(fn (PayoutSlip $slip) => $this->markPaidInDatabase($slip));
        });

        $this->reportPaidToHr($payout->id);
    }

    private function markPaidInDatabase(PayoutSlip $slip): PayoutSlip
    {
        $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

        if (! $slip->payout()->first()?->canBePaid()) {
            throw ValidationException::withMessages(['payout_slip' => 'Slip baru bisa dibayar setelah pencairan di-acc HR.']);
        }

        if (! $slip->isPaid()) {
            $slip->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
        }

        $payout = Payout::query()->lockForUpdate()->findOrFail($slip->payout_id);

        if ($payout->slips()->where('status', '!=', PayoutStatus::Paid->value)->doesntExist()) {
            $payout->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
        }

        return $slip;
    }

    /**
     * Kirim semua slip yang sudah dibayar di pencairan ini ke HR, supaya HR tahu kapan gaji benar-benar dibayar.
     * Hanya untuk pencairan yang sudah di-acc HR; kalau HR tidak bisa dihubungi cukup dicatat di log
     * (pembayaran slip berikutnya ikut mengirim ulang semuanya).
     */
    private function reportPaidToHr(int $payoutId): void
    {
        $payout = Payout::query()->find($payoutId);

        if (! $payout || $payout->hr_status !== Payout::HR_APPROVED || ! $this->hr->isConfigured()) {
            return;
        }

        $paidSlips = $payout->slips()
            ->where('status', PayoutStatus::Paid->value)
            ->get(['id', 'paid_at'])
            ->map(fn (PayoutSlip $slip): array => [
                'opsew_slip_id' => $slip->id,
                'paid_at' => ($slip->paid_at ?? now())->toIso8601String(),
            ])
            ->values()
            ->all();

        try {
            $this->hr->reportPayoutPaid($payout->id, $paidSlips);
        } catch (\Throwable $exception) {
            Log::warning('Status bayar gaji penjahit belum terkirim ke hr-azzahra', [
                'payout_id' => $payout->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function deleteDraft(Payout $payout): void
    {
        DB::transaction(function () use ($payout) {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);

            if (! $payout->isDraft() || $payout->slips()->where('status', PayoutStatus::Paid->value)->exists()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan yang sudah ada slip dibayar tidak bisa dihapus.']);
            }

            if ($payout->isLockedByHr()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan ini sedang/sudah di-acc HR. Minta HR mengembalikannya dulu sebelum dihapus.']);
            }

            $payout->delete();
        });
    }

    /**
     * Hapus total pencairan (khusus Owner), termasuk slip yang sudah dibayar, untuk mengulang dari awal.
     * Setoran, revisi bahan, dan uang makan di dalamnya kembali berstatus "belum dibayar"
     * sehingga bisa dihitung lagi di pencairan baru. Dicatat di log sebagai jejak audit.
     */
    public function forceDelete(Payout $payout, string $confirmCode, ?int $userId = null): void
    {
        if (trim($confirmCode) !== $payout->code) {
            throw ValidationException::withMessages(['confirm_code' => "Ketik kode \"{$payout->code}\" persis untuk konfirmasi."]);
        }

        DB::transaction(function () use ($payout, $userId) {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);
            $paidSlips = $payout->slips()->where('status', PayoutStatus::Paid->value)->count();

            Log::warning('Pencairan gaji dihapus total', [
                'payout_id' => $payout->id,
                'code' => $payout->code,
                'cutoff_date' => $payout->cutoff_date?->toDateString(),
                'total_amount' => $payout->total_amount,
                'slips' => $payout->slips()->count(),
                'paid_slips' => $paidSlips,
                'user_id' => $userId,
            ]);

            // Slip & baris slip ikut terhapus lewat cascade.
            $payout->delete();
        });
    }

    private function refreshTotals(int $payoutId): void
    {
        $payout = Payout::query()->lockForUpdate()->findOrFail($payoutId);
        $payout->forceFill(['total_amount' => (int) $payout->slips()->sum('net_amount')])->save();
    }
}
