<?php

namespace App\Services\Sewing;

use App\Enums\PayoutStatus;
use App\Enums\TailorType;
use App\Models\SewingSetting;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use App\Models\TargetDay;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Aturan uang makan penjahit internal, bisa diubah admin dari halaman Absensi:
 * - nominal per hari hadir mengikuti masa kerja (tanggal masuk penjahit),
 * - di hari target, penjahit yang datang setelah jam mulai atau pulang sebelum jam selesai dipotong sesuai tingkat masa kerjanya.
 */
class MealAllowancePolicy
{
    public const SETTING_KEY = 'meal_allowance';

    /**
     * Patokan awal sebelum admin menyimpan aturan sendiri. Potongan hari target belum ditentukan, jadi 0.
     *
     * @var array{tiers: list<array{min_years: float, amount: int, target_deduction: int}>, target_start: string, target_end: string}
     */
    public const DEFAULT_SETTINGS = [
        'tiers' => [
            ['min_years' => 0, 'amount' => 25_000, 'target_deduction' => 0],
            ['min_years' => 1, 'amount' => 30_000, 'target_deduction' => 0],
            ['min_years' => 2, 'amount' => 35_000, 'target_deduction' => 0],
        ],
        'target_start' => '06:00',
        'target_end' => '21:30',
    ];

    /** @var array{tiers: list<array{min_years: float, amount: int, target_deduction: int}>, target_start: string, target_end: string}|null */
    private ?array $settings = null;

    /**
     * @return array{tiers: list<array{min_years: float, amount: int, target_deduction: int}>, target_start: string, target_end: string}
     */
    public function settings(): array
    {
        if ($this->settings !== null) {
            return $this->settings;
        }

        $stored = SewingSetting::valueOf(self::SETTING_KEY) ?? [];
        $tiers = collect($stored['tiers'] ?? self::DEFAULT_SETTINGS['tiers'])
            ->map(fn (array $tier): array => [
                'min_years' => (float) ($tier['min_years'] ?? 0),
                'amount' => (int) ($tier['amount'] ?? 0),
                'target_deduction' => (int) ($tier['target_deduction'] ?? 0),
            ])
            ->sortBy('min_years')
            ->values()
            ->all();

        return $this->settings = [
            'tiers' => $tiers !== [] ? $tiers : self::DEFAULT_SETTINGS['tiers'],
            'target_start' => (string) ($stored['target_start'] ?? self::DEFAULT_SETTINGS['target_start']),
            'target_end' => (string) ($stored['target_end'] ?? self::DEFAULT_SETTINGS['target_end']),
        ];
    }

    /**
     * @param  array{tiers: list<array{min_years: float, amount: int, target_deduction: int}>, target_start: string, target_end: string}  $settings
     */
    public function save(array $settings, ?int $userId = null): void
    {
        SewingSetting::store(self::SETTING_KEY, $settings, $userId);
        $this->settings = null;
    }

    /**
     * Tingkat uang makan untuk masa kerja penjahit pada tanggal tertentu. Tanggal masuk kosong = tingkat paling rendah.
     *
     * @return array{min_years: float, amount: int, target_deduction: int, tenure_known: bool}
     */
    public function tierFor(Tailor $tailor, CarbonInterface|string $date): array
    {
        $tiers = $this->settings()['tiers'];
        $joinedAt = $tailor->joined_at;

        if ($joinedAt === null) {
            return [...$tiers[0], 'tenure_known' => false];
        }

        $tenureYears = $joinedAt->diffInMonths(Carbon::parse($date)) / 12;
        $tier = collect($tiers)->filter(fn (array $tier): bool => $tenureYears >= $tier['min_years'])->last() ?? $tiers[0];

        return [...$tier, 'tenure_known' => true];
    }

    /**
     * Uang makan satu hari. Hanya status "present" yang dapat uang makan.
     * Di hari target dipotong kalau jam masuk lewat dari jam mulai atau jam pulang sebelum jam selesai
     * (jam yang belum diisi tidak dianggap kurang).
     */
    public function amountFor(Tailor $tailor, CarbonInterface|string $date, string $status, ?string $clockIn, ?string $clockOut, ?TargetDay $targetDay): int
    {
        if ($status !== 'present') {
            return 0;
        }

        $tier = $this->tierFor($tailor, $date);

        if ($targetDay && $this->missesTarget($targetDay, $clockIn, $clockOut)) {
            return max(0, $tier['amount'] - $tier['target_deduction']);
        }

        return $tier['amount'];
    }

    public function missesTarget(TargetDay $targetDay, ?string $clockIn, ?string $clockOut): bool
    {
        $clockIn = $clockIn ? substr($clockIn, 0, 5) : null;
        $clockOut = $clockOut ? substr($clockOut, 0, 5) : null;

        return ($clockIn !== null && $clockIn > $targetDay->startClock())
            || ($clockOut !== null && $clockOut < $targetDay->endClock());
    }

    public function targetDayOn(CarbonInterface|string $date): ?TargetDay
    {
        return TargetDay::query()->whereDate('date', Carbon::parse($date)->toDateString())->first();
    }

    /**
     * Hitung ulang uang makan absensi yang belum dibayar (setelah aturan atau hari target berubah).
     * Absensi yang ada di draft gaji ikut berubah; draft-nya perlu "Hitung ulang".
     *
     * @return array{updated: int, on_draft_slip: int}
     */
    public function recalculateUnpaid(?string $onlyDate = null): array
    {
        $result = ['updated' => 0, 'on_draft_slip' => 0];

        $attendances = TailorAttendance::query()
            ->with(['tailor', 'slipLine.slip'])
            ->when($onlyDate, fn ($query) => $query->whereDate('date', $onlyDate))
            ->whereDoesntHave('slipLine.slip', fn ($query) => $query->where('status', PayoutStatus::Paid->value))
            ->whereHas('tailor', fn ($query) => $query->where('type', TailorType::Internal->value))
            ->get();

        /** @var Collection<string, TargetDay> $targetDays */
        $targetDays = TargetDay::query()
            ->whereIn('date', $attendances->map(fn (TailorAttendance $attendance): string => $attendance->date->toDateString())->unique()->values())
            ->get()
            ->keyBy(fn (TargetDay $day): string => $day->date->toDateString());

        foreach ($attendances as $attendance) {
            $amount = $this->amountFor(
                $attendance->tailor,
                $attendance->date,
                $attendance->status,
                $attendance->clock_in,
                $attendance->clock_out,
                $targetDays->get($attendance->date->toDateString()),
            );

            if ($amount === (int) $attendance->meal_allowance) {
                continue;
            }

            $attendance->update(['meal_allowance' => $amount]);
            $result['updated']++;

            if ($attendance->slipLine) {
                $result['on_draft_slip']++;
            }
        }

        return $result;
    }
}
