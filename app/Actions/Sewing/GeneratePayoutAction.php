<?php

namespace App\Actions\Sewing;

use App\Enums\PayoutLineType;
use App\Enums\PayoutStatus;
use App\Enums\RevisionStatus;
use App\Enums\RevisionType;
use App\Enums\TailorType;
use App\Models\Payout;
use App\Models\PayoutSlip;
use App\Models\Revision;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use App\Services\Sewing\HrAzzahraClient;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * (Re)builds a draft pay run: every payable setor, finished material revision, and attendance meal allowance
 * up to the cut-off date that is not on any slip yet. Bonus, deductions and notes typed earlier are kept per tailor.
 * Sebelum menghitung, absensi penjahit ditarik dari hr-azzahra dan kasbon yang belum lunas ikut dipotong.
 */
class GeneratePayoutAction
{
    /** Berapa hari ke belakang dari tanggal batas absensi HR ditarik ulang. */
    private const HR_ATTENDANCE_LOOKBACK_DAYS = 31;

    /**
     * Catatan untuk admin kalau HR tidak bisa dihubungi; slip tetap dihitung dari data OPSEW.
     *
     * @var list<string>
     */
    public array $warnings = [];

    public function __construct(
        private readonly HrAzzahraClient $hr,
        private readonly PullHrAttendancesAction $pullHrAttendances,
    ) {}

    /**
     * Ambil data HR di luar transaksi database: tarik absensi sampai tanggal batas, lalu kasbon yang belum lunas.
     *
     * @return array<string, array{total_outstanding: int, loans: list<array<string, mixed>>}> kasbon per nomor karyawan HR
     */
    public function prepareFromHr(CarbonInterface $cutoff): array
    {
        $this->warnings = [];

        if (! $this->hr->isConfigured()) {
            return [];
        }

        try {
            $this->pullHrAttendances->execute(
                $cutoff->copy()->subDays(self::HR_ATTENDANCE_LOOKBACK_DAYS)->toDateString(),
                $cutoff->toDateString(),
            );
        } catch (\Throwable $exception) {
            $this->warnings[] = 'Absensi HR tidak bisa ditarik, uang makan memakai absensi yang ada di OPSEW. ('.$exception->getMessage().')';
        }

        try {
            return $this->hr->outstandingKasbonsFor(
                Tailor::query()
                    ->where('type', TailorType::Internal->value)
                    ->whereNotNull('hr_employee_number')
                    ->pluck('hr_employee_number')
                    ->all(),
            );
        } catch (\Throwable $exception) {
            $this->warnings[] = 'Kasbon HR tidak bisa dibaca, slip dihitung tanpa potongan kasbon. Tekan "Hitung ulang" setelah HR bisa dihubungi. ('.$exception->getMessage().')';

            return [];
        }
    }

    /**
     * @param  array<string, array{total_outstanding: int, loans: list<array<string, mixed>>}>|null  $outstandingKasbons  hasil prepareFromHr(); null = ambil sekarang
     */
    public function execute(Payout $payout, ?array $outstandingKasbons = null): Payout
    {
        $outstandingKasbons ??= $this->prepareFromHr($payout->cutoff_date);

        return DB::transaction(function () use ($payout, $outstandingKasbons) {
            $payout = Payout::query()->lockForUpdate()->findOrFail($payout->id);

            if (! $payout->isDraft()) {
                throw ValidationException::withMessages(['payout' => 'Pencairan yang sudah dibayar tidak bisa dihitung ulang.']);
            }

            if ($payout->slips()->where('status', PayoutStatus::Paid->value)->exists()) {
                throw ValidationException::withMessages(['payout' => 'Sudah ada slip yang dibayar, jadi pencairan ini tidak bisa dihitung ulang.']);
            }

            $adjustments = $payout->slips()->get()->keyBy('tailor_id');
            $payout->slips()->delete();

            $cutoff = $payout->cutoff_date->copy()->endOfDay();
            $deliveries = $this->unpaidDeliveries($cutoff)->groupBy('tailor_id');
            $revisions = $this->unpaidRevisions($cutoff)->groupBy('tailor_id');
            $attendances = $this->unpaidAttendances($cutoff)->groupBy('tailor_id');

            $totals = ['tailors' => 0, 'qty' => 0, 'amount' => 0];

            $allTailorIds = $deliveries->keys()
                ->merge($revisions->keys())
                ->merge($attendances->keys())
                ->unique();
            $hrNumbers = Tailor::query()->whereIn('id', $allTailorIds)->pluck('hr_employee_number', 'id');

            foreach ($allTailorIds as $tailorId) {
                $hrNumber = (string) ($hrNumbers->get($tailorId) ?? '');

                $slip = $this->buildSlip(
                    $payout,
                    (int) $tailorId,
                    $deliveries->get($tailorId, collect()),
                    $revisions->get($tailorId, collect()),
                    $attendances->get($tailorId, collect()),
                    $adjustments->get($tailorId),
                    $hrNumber !== '' ? (array) ($outstandingKasbons[$hrNumber]['loans'] ?? []) : [],
                );

                $totals['tailors']++;
                $totals['qty'] += $slip->qty;
                $totals['amount'] += $slip->net_amount;
            }

            $payout->forceFill([
                'total_tailors' => $totals['tailors'],
                'total_qty' => $totals['qty'],
                'total_amount' => $totals['amount'],
                'generated_at' => now(),
            ])->save();

            return $payout->load('slips');
        });
    }

    /**
     * @return Collection<int, SewingDelivery>
     */
    private function unpaidDeliveries($cutoff): Collection
    {
        return SewingDelivery::query()
            ->with('workOrderItem.article')
            ->where('is_payable', true)
            ->where('delivered_at', '<=', $cutoff)
            ->whereDoesntHave('slipLine')
            ->whereHas('tailor', fn ($q) => $q->where('type', TailorType::Internal->value))
            ->orderBy('delivered_at')
            ->get();
    }

    /**
     * @return Collection<int, Revision>
     */
    private function unpaidRevisions($cutoff): Collection
    {
        return Revision::query()
            ->with('workOrderItem.article')
            ->where('type', RevisionType::Material->value)
            ->where('status', RevisionStatus::Done->value)
            ->where('subtotal', '>', 0)
            ->where('completed_at', '<=', $cutoff)
            ->whereDoesntHave('slipLine')
            ->whereHas('tailor', fn ($q) => $q->where('type', TailorType::Internal->value))
            ->orderBy('completed_at')
            ->get();
    }

    /**
     * @return Collection<int, TailorAttendance>
     */
    private function unpaidAttendances($cutoff): Collection
    {
        return TailorAttendance::query()
            ->where('status', 'present')
            ->where('meal_allowance', '>', 0)
            ->where('date', '<=', $cutoff->toDateString())
            ->whereDoesntHave('slipLine')
            ->whereHas('tailor', fn ($q) => $q->where('type', TailorType::Internal->value))
            ->orderBy('date')
            ->get();
    }

    /**
     * @param  Collection<int, SewingDelivery>  $deliveries
     * @param  Collection<int, Revision>  $revisions
     * @param  Collection<int, TailorAttendance>  $attendances
     * @param  list<array<string, mixed>>  $kasbonLoans  kasbon HR yang belum lunas, urut dari yang paling lama
     */
    private function buildSlip(
        Payout $payout,
        int $tailorId,
        Collection $deliveries,
        Collection $revisions,
        Collection $attendances,
        ?PayoutSlip $previous,
        array $kasbonLoans = [],
    ): PayoutSlip {
        $gross = (int) $deliveries->sum('subtotal') + (int) $revisions->sum('subtotal') + (int) $attendances->sum('meal_allowance');
        $bonus = $previous?->bonus_amount ?? 0;
        $deduction = min($previous?->deduction_amount ?? 0, $gross + $bonus);
        $kasbonDeductions = $this->allocateKasbon($kasbonLoans, $gross + $bonus - $deduction);
        $kasbonAmount = (int) array_sum(array_column($kasbonDeductions, 'amount'));

        $slip = $payout->slips()->create([
            'tailor_id' => $tailorId,
            'invoice_number' => $payout->code.'-'.Str::padLeft((string) $tailorId, 4, '0'),
            'public_token' => $previous?->public_token ?? Str::random(48),
            'status' => PayoutStatus::Draft,
            'qty' => (int) $deliveries->sum('qty'),
            'gross_amount' => $gross,
            'bonus_amount' => $bonus,
            'deduction_amount' => $deduction,
            'kasbon_amount' => $kasbonAmount,
            'kasbon_deductions' => $kasbonDeductions !== [] ? $kasbonDeductions : null,
            'net_amount' => $gross + $bonus - $deduction - $kasbonAmount,
            'notes' => $previous?->notes,
        ]);

        foreach ($deliveries as $delivery) {
            $slip->lines()->create([
                'type' => PayoutLineType::Sewing,
                'sewing_delivery_id' => $delivery->id,
                'description' => $delivery->workOrderItem->article->name,
                'color' => $delivery->workOrderItem->color,
                'size' => $delivery->workOrderItem->size,
                'qty' => $delivery->qty,
                'rate' => $delivery->sewing_rate,
                'subtotal' => $delivery->subtotal,
                'occurred_at' => $delivery->delivered_at,
            ]);
        }

        foreach ($revisions as $revision) {
            $slip->lines()->create([
                'type' => PayoutLineType::Revision,
                'revision_id' => $revision->id,
                'description' => "Revisi {$revision->part_name} — {$revision->workOrderItem->article->name}",
                'color' => $revision->workOrderItem->color,
                'size' => $revision->workOrderItem->size,
                'qty' => $revision->qty,
                'rate' => $revision->rate,
                'subtotal' => $revision->subtotal,
                'occurred_at' => $revision->completed_at,
            ]);
        }

        foreach ($attendances as $attendance) {
            $dateLabel = $attendance->date->translatedFormat('d M Y');
            $hoursLabel = $attendance->working_hours ? " ({$attendance->working_hours}j)" : '';

            $slip->lines()->create([
                'type' => PayoutLineType::MealAllowance,
                'tailor_attendance_id' => $attendance->id,
                'description' => "Uang makan kehadiran {$dateLabel}{$hoursLabel}",
                'color' => null,
                'size' => null,
                'qty' => 1,
                'rate' => $attendance->meal_allowance,
                'subtotal' => $attendance->meal_allowance,
                'occurred_at' => $attendance->date->copy()->setTime(17, 0),
            ]);
        }

        return $slip;
    }

    /**
     * Potong kasbon dari yang paling lama, sebanyak sisa kasbon tapi tidak melebihi gaji yang tersedia.
     *
     * @param  list<array<string, mixed>>  $loans
     * @return list<array{kasbon_id: int, kasbon_number: string, amount: int, remaining_before: int}>
     */
    private function allocateKasbon(array $loans, int $available): array
    {
        $deductions = [];

        foreach ($loans as $loan) {
            $remaining = (int) ($loan['remaining_amount'] ?? 0);
            $amount = min($remaining, $available);

            if ($amount <= 0) {
                continue;
            }

            $deductions[] = [
                'kasbon_id' => (int) $loan['id'],
                'kasbon_number' => (string) ($loan['kasbon_number'] ?? ''),
                'amount' => $amount,
                'remaining_before' => $remaining,
            ];
            $available -= $amount;
        }

        return $deductions;
    }
}
