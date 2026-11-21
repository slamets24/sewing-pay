<?php

namespace App\Actions\Sewing;

use App\Enums\TailorType;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use App\Services\Sewing\HrAzzahraClient;
use Illuminate\Support\Facades\DB;

/**
 * Menarik absensi penjahit dari hr-azzahra ke absensi OPSEW (dasar uang makan), supaya absensi tidak diinput dua kali.
 * HR jadi sumber utama: catatan lokal ditimpa, kecuali yang sudah dibayar di slip gaji.
 */
class PullHrAttendancesAction
{
    /**
     * Status absensi HR → status absensi OPSEW.
     *
     * @var array<string, string>
     */
    private const STATUS_MAP = [
        'present' => 'present',
        'absent' => 'alpha',
        'leave' => 'permission',
        'cuti' => 'permission',
        'pulang' => 'permission',
        'sick' => 'sick',
        'off' => 'off',
    ];

    public function __construct(private readonly HrAzzahraClient $client) {}

    /**
     * @return array{created: int, updated: int, on_draft_slip: int, skipped_paid: int, unmatched: int}
     */
    public function execute(string $dateFrom, string $dateTo, ?int $userId = null): array
    {
        $records = $this->client->attendancesBetween($dateFrom, $dateTo);
        $result = ['created' => 0, 'updated' => 0, 'on_draft_slip' => 0, 'skipped_paid' => 0, 'unmatched' => 0];

        if ($records === []) {
            return $result;
        }

        $tailors = Tailor::query()
            ->where('type', TailorType::Internal->value)
            ->where(fn ($query) => $query->whereNotNull('hr_employee_id')->orWhereNotNull('hr_employee_number'))
            ->get(['id', 'hr_employee_id', 'hr_employee_number']);
        $tailorsByHrId = $tailors->whereNotNull('hr_employee_id')->keyBy(fn (Tailor $tailor): int => (int) $tailor->hr_employee_id);
        $tailorsByNumber = $tailors->filter(fn (Tailor $tailor): bool => filled($tailor->hr_employee_number))->keyBy('hr_employee_number');

        DB::transaction(function () use ($records, $tailorsByHrId, $tailorsByNumber, $userId, &$result): void {
            foreach ($records as $record) {
                $tailor = $tailorsByHrId->get((int) ($record['employee_id'] ?? 0))
                    ?? $tailorsByNumber->get((string) ($record['employee_number'] ?? ''));

                if (! $tailor || empty($record['date'])) {
                    $result['unmatched']++;

                    continue;
                }

                $this->upsertAttendance($tailor, $record, $userId, $result);
            }
        });

        return $result;
    }

    /**
     * @param  array<string, mixed>  $record
     * @param  array{created: int, updated: int, on_draft_slip: int, skipped_paid: int, unmatched: int}  $result
     */
    private function upsertAttendance(Tailor $tailor, array $record, ?int $userId, array &$result): void
    {
        $status = self::STATUS_MAP[(string) ($record['status'] ?? '')] ?? 'present';
        $clockIn = $this->clock($record['clock_in'] ?? null);
        $clockOut = $this->clock($record['clock_out'] ?? null);
        $workingHours = TailorAttendance::determineWorkingHours($clockIn, $clockOut);

        $values = [
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'working_hours' => $workingHours,
            'meal_allowance' => TailorAttendance::calculateMealAllowance($workingHours, $status),
            'status' => $status,
            'is_self_clocked' => false,
            'note' => filled($record['note'] ?? null) ? mb_substr((string) $record['note'], 0, 500) : 'Dari HR',
            'created_by' => $userId,
        ];

        $attendance = TailorAttendance::query()
            ->with('slipLine.slip')
            ->where('tailor_id', $tailor->id)
            ->whereDate('date', (string) $record['date'])
            ->lockForUpdate()
            ->first();

        if (! $attendance) {
            TailorAttendance::query()->create([...$values, 'tailor_id' => $tailor->id, 'date' => (string) $record['date']]);
            $result['created']++;

            return;
        }

        $slip = $attendance->slipLine?->slip;

        if ($slip?->isPaid()) {
            $result['skipped_paid']++;

            return;
        }

        $attendance->update($values);
        $result['updated']++;

        if ($slip) {
            $result['on_draft_slip']++;
        }
    }

    private function clock(mixed $value): ?string
    {
        $value = trim((string) $value);

        return preg_match('/^\d{2}:\d{2}/', $value) ? substr($value, 0, 5) : null;
    }
}
