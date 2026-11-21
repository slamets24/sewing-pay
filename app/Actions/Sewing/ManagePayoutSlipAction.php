<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutStatus;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Services\Sewing\HrAzzahraClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Bonus/deduction edits and paying slips; the pay run closes when its last slip is paid.
 * Saat slip dibayar, potongan kasbonnya dicatat ke hr-azzahra (aman diulang, HR menolak catatan ganda).
 */
class ManagePayoutSlipAction
{
    public function __construct(private readonly HrAzzahraClient $hr) {}

    /**
     * @param  array{bonus_amount: int, deduction_amount: int, notes?: ?string}  $data
     */
    public function adjust(PayoutSlip $slip, array $data): PayoutSlip
    {
        return DB::transaction(function () use ($slip, $data) {
            $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

            if ($slip->isPaid()) {
                throw ValidationException::withMessages(['payout_slip' => 'Slip yang sudah dibayar tidak bisa diubah.']);
            }

            $net = $slip->gross_amount + (int) $data['bonus_amount'] - (int) $data['deduction_amount'] - $slip->kasbon_amount;

            if ($net < 0) {
                throw ValidationException::withMessages([
                    'deduction_amount' => $slip->kasbon_amount > 0
                        ? 'Potongan ditambah potongan kasbon tidak boleh melebihi gaji kotor ditambah bonus.'
                        : 'Potongan tidak boleh melebihi gaji kotor ditambah bonus.',
                ]);
            }

            $slip->forceFill([
                'bonus_amount' => (int) $data['bonus_amount'],
                'deduction_amount' => (int) $data['deduction_amount'],
                'net_amount' => $net,
                'notes' => $data['notes'] ?? null,
            ])->save();

            $this->refreshTotals($slip->payout_id);

            return $slip;
        });
    }

    /**
     * Tandai slip dibayar, lalu catat potongan kasbonnya ke HR.
     * Kalau HR gagal dihubungi, slip tetap dibayar dan potongannya bisa dikirim ulang (lihat reportKasbon).
     */
    public function markPaid(PayoutSlip $slip): PayoutSlip
    {
        $slip = $this->markPaidInDatabase($slip);
        $this->reportKasbon($slip);

        return $slip->refresh();
    }

    private function markPaidInDatabase(PayoutSlip $slip): PayoutSlip
    {
        return DB::transaction(function () use ($slip) {
            $slip = PayoutSlip::query()->lockForUpdate()->findOrFail($slip->id);

            if (! $slip->isPaid()) {
                $slip->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
            }

            $payout = Payout::query()->lockForUpdate()->findOrFail($slip->payout_id);

            if ($payout->slips()->where('status', '!=', PayoutStatus::Paid->value)->doesntExist()) {
                $payout->forceFill(['status' => PayoutStatus::Paid, 'paid_at' => now()])->save();
            }

            return $slip;
        });
    }

    /**
     * @return int jumlah slip yang potongan kasbonnya belum tercatat di HR
     */
    public function markAllPaid(Payout $payout): int
    {
        $paidSlips = DB::transaction(function () use ($payout) {
            if ($payout->slips()->doesntExist()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan ini belum punya slip.']);
            }

            return $payout->slips()
                ->where('status', '!=', PayoutStatus::Paid->value)
                ->get()
                ->map(fn (PayoutSlip $slip) => $this->markPaidInDatabase($slip));
        });

        return $paidSlips
            ->filter(fn (PayoutSlip $slip): bool => $this->reportKasbon($slip) !== null)
            ->count();
    }

    /**
     * Catat potongan kasbon slip yang sudah dibayar ke hr-azzahra. Nomor slip + id slip dipakai sebagai referensi,
     * jadi kiriman ulang tidak memotong dua kali.
     *
     * @return string|null null kalau tidak ada yang perlu dikirim atau semua potongan sudah tercatat di HR, selain itu alasan gagalnya
     */
    public function reportKasbon(PayoutSlip $slip): ?string
    {
        if (! $slip->hasPendingKasbonReport()) {
            return null;
        }

        $reference = "{$slip->invoice_number}/{$slip->id}";

        try {
            foreach ((array) $slip->kasbon_deductions as $deduction) {
                $this->hr->deductKasbon(
                    (int) $deduction['kasbon_id'],
                    (int) $deduction['amount'],
                    $reference,
                    "Potong gaji jahit slip {$slip->invoice_number}",
                );
            }
        } catch (\Throwable $exception) {
            Log::warning('Potongan kasbon belum tercatat di hr-azzahra', [
                'payout_slip_id' => $slip->id,
                'invoice_number' => $slip->invoice_number,
                'error' => $exception->getMessage(),
            ]);

            return $exception->getMessage();
        }

        $slip->forceFill(['kasbon_reported_at' => now()])->save();

        return null;
    }

    public function deleteDraft(Payout $payout): void
    {
        DB::transaction(function () use ($payout) {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);

            if (! $payout->isDraft() || $payout->slips()->where('status', PayoutStatus::Paid->value)->exists()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan yang sudah ada slip dibayar tidak bisa dihapus.']);
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
                // Potongan kasbon yang sudah tercatat di HR tidak ikut dibatalkan; koreksi manual di hr-azzahra.
                'kasbon_reported_slips' => $payout->slips()->whereNotNull('kasbon_reported_at')->pluck('invoice_number')->all(),
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
