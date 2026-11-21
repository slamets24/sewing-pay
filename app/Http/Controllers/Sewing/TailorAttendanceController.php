<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\PullHrAttendancesAction;
use App\Enums\TailorType;
use App\Http\Controllers\Controller;
use App\Models\Tailor;
use App\Models\TailorAttendance;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TailorAttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $date = $this->safeDate($request->query('date'));

        $internalTailors = Tailor::query()
            ->where('is_active', true)
            ->where('type', 'internal')
            ->orderBy('name')
            ->get();

        $attendances = TailorAttendance::query()
            ->whereDate('date', $date)
            ->get()
            ->keyBy('tailor_id');

        $rows = $internalTailors->map(function (Tailor $tailor) use ($attendances, $date) {
            /** @var TailorAttendance|null $attendance */
            $attendance = $attendances->get($tailor->id);

            return [
                'id' => $attendance?->id,
                'tailor_id' => $tailor->id,
                'tailor_name' => $tailor->name,
                'tailor_code' => $tailor->code,
                'date' => $date,
                'clock_in' => $attendance?->clock_in ? substr($attendance->clock_in, 0, 5) : null,
                'clock_out' => $attendance?->clock_out ? substr($attendance->clock_out, 0, 5) : null,
                'working_hours' => $attendance?->working_hours ?? 9,
                'meal_allowance' => $attendance?->meal_allowance ?? TailorAttendance::calculateMealAllowance(9),
                'status' => $attendance?->status ?? 'present',
                'is_self_clocked' => $attendance?->is_self_clocked ?? false,
                'is_recorded' => $attendance !== null,
                'note' => $attendance?->note ?? '',
            ];
        });

        $recordedPresent = $rows->where('is_recorded', true)->where('status', 'present');
        $recordedCount = $recordedPresent->count();
        $totalAllowance = $recordedPresent->sum('meal_allowance');
        $permissionCount = $rows->where('is_recorded', true)->whereIn('status', ['permission', 'sick'])->count();
        $unrecordedCount = $rows->where('is_recorded', false)->count();

        return Inertia::render('Attendance/Index', [
            'date' => $date,
            'rows' => $rows->values()->all(),
            'summary' => [
                'present_count' => $recordedCount,
                'total_allowance' => $totalAllowance,
                'permission_count' => $permissionCount,
                'unrecorded_count' => $unrecordedCount,
                'total_internal' => $internalTailors->count(),
            ],
            'mealAllowanceRules' => config('sewing.meal_allowance', [
                'under_10_hours' => 30_000,
                'ten_hours_or_more' => 35_000,
            ]),
            'standardBenchmarkRates' => config('sewing.benchmark_standard_rates', [
                9 => 241_400,
                10 => 265_000,
                11 => 295_000,
                12 => 321_800,
            ]),
        ]);
    }

    public function storeOrUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tailor_id' => ['required', 'integer', Rule::exists('tailors', 'id')->where('type', TailorType::Internal->value)],
            'date' => ['required', 'date'],
            'clock_in' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'clock_out' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'working_hours' => ['required', 'integer', 'in:9,10,11,12'],
            'meal_allowance' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'string', 'in:present,permission,sick,alpha,off'],
            'note' => ['nullable', 'string', 'max:500'],
        ], [
            'tailor_id.exists' => 'Absensi hanya untuk penjahit internal.',
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $workingHours = (int) $validated['working_hours'];

        if ($validated['status'] !== 'present') {
            $mealAllowance = 0;
        } elseif (isset($validated['meal_allowance']) && $validated['meal_allowance'] !== null) {
            $mealAllowance = (int) $validated['meal_allowance'];
        } else {
            $mealAllowance = TailorAttendance::calculateMealAllowance($workingHours);
        }

        $attendance = TailorAttendance::query()
            ->where('tailor_id', $validated['tailor_id'])
            ->whereDate('date', $date)
            ->first();

        $wasOnDraftSlip = false;
        if ($attendance) {
            $slip = $attendance->slipLine?->slip;
            if ($slip?->isPaid()) {
                throw ValidationException::withMessages([
                    'attendance' => 'Absensi ini sudah dibayar di slip '.$slip->invoice_number.', jadi tidak bisa diubah lagi.',
                ]);
            }
            $wasOnDraftSlip = $slip !== null;

            $attendance->update([
                'clock_in' => ($validated['clock_in'] ?? null) ?: null,
                'clock_out' => ($validated['clock_out'] ?? null) ?: null,
                'working_hours' => $workingHours,
                'meal_allowance' => $mealAllowance,
                'status' => $validated['status'],
                'note' => ($validated['note'] ?? null) ?: null,
                'created_by' => $request->user()->id,
            ]);
        } else {
            TailorAttendance::query()->create([
                'tailor_id' => $validated['tailor_id'],
                'date' => $date,
                'clock_in' => ($validated['clock_in'] ?? null) ?: null,
                'clock_out' => ($validated['clock_out'] ?? null) ?: null,
                'working_hours' => $workingHours,
                'meal_allowance' => $mealAllowance,
                'status' => $validated['status'],
                'note' => ($validated['note'] ?? null) ?: null,
                'created_by' => $request->user()->id,
            ]);
        }

        if ($wasOnDraftSlip) {
            return back()->with('status', 'Absensi disimpan. Absensi ini sudah ada di draft gaji, jadi tekan "Hitung ulang" di draft itu supaya nominalnya ikut berubah.');
        }

        // The attendance page saves on every tap and shows "Tersimpan" inline, so it asks for no toast.
        return $request->boolean('quiet') ? back() : back()->with('status', 'Absensi berhasil disimpan.');
    }

    public function batchPresent(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'working_hours' => ['nullable', 'integer', 'in:9,10,11,12'],
        ]);

        $date = Carbon::parse($validated['date'])->toDateString();
        $hours = $validated['working_hours'] ?? 9;
        $allowance = TailorAttendance::calculateMealAllowance($hours);

        $tailors = Tailor::query()->where('is_active', true)->where('type', 'internal')->get();

        foreach ($tailors as $tailor) {
            TailorAttendance::query()->firstOrCreate(
                ['tailor_id' => $tailor->id, 'date' => $date],
                [
                    'clock_in' => '08:00',
                    'clock_out' => $hours === 9 ? '17:00' : ($hours === 10 ? '18:00' : ($hours === 11 ? '19:00' : '20:00')),
                    'working_hours' => $hours,
                    'meal_allowance' => $allowance,
                    'status' => 'present',
                    'is_self_clocked' => false,
                    'created_by' => $request->user()->id,
                ]
            );
        }

        return back()->with('status', "Semua penjahit internal ditandai hadir {$hours} jam (Uang makan: Rp. ".number_format($allowance, 0, ',', '.').').');
    }

    /**
     * Tombol "Tarik dari HR": ambil absensi penjahit dari hr-azzahra untuk rentang tanggal, langsung saat diklik.
     */
    public function pullFromHr(Request $request, PullHrAttendancesAction $pull): RedirectResponse
    {
        $validated = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
        ]);

        $dateFrom = Carbon::parse($validated['date_from'])->toDateString();
        $dateTo = Carbon::parse($validated['date_to'])->toDateString();

        if (Carbon::parse($dateFrom)->diffInDays(Carbon::parse($dateTo)) > 62) {
            throw ValidationException::withMessages(['date_from' => 'Rentang tarik absensi maksimal 62 hari.']);
        }

        try {
            $result = $pull->execute($dateFrom, $dateTo, $request->user()->id);
        } catch (\Throwable $exception) {
            return back()->with('error', 'Gagal menarik absensi dari HR: '.$exception->getMessage());
        }

        $notes = array_filter([
            $result['skipped_paid'] > 0 ? "{$result['skipped_paid']} sudah dibayar jadi tidak diubah" : null,
            $result['unmatched'] > 0 ? "{$result['unmatched']} karyawan HR belum terhubung ke penjahit (jalankan Sinkron HR)" : null,
            $result['on_draft_slip'] > 0 ? "{$result['on_draft_slip']} ada di draft gaji, tekan \"Hitung ulang\" di draft itu" : null,
        ]);

        return back()->with('status', "Absensi HR ditarik: {$result['created']} baru, {$result['updated']} diperbarui".($notes !== [] ? ' · '.implode(' · ', $notes) : '').'.');
    }

    public function destroy(TailorAttendance $attendance): RedirectResponse
    {
        $slip = $attendance->slipLine?->slip;
        if ($slip) {
            throw ValidationException::withMessages([
                'attendance' => $slip->isPaid()
                    ? 'Absensi ini sudah dibayar di slip '.$slip->invoice_number.', jadi tidak bisa dihapus.'
                    : 'Absensi ini sudah masuk draft gaji. Hapus draft gaji itu dulu.',
            ]);
        }

        $attendance->delete();

        return back()->with('status', 'Catatan absensi dihapus.');
    }

    private function safeDate(mixed $value): string
    {
        if (! is_string($value) || $value === '') {
            return today()->toDateString();
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return today()->toDateString();
        }
    }
}
