<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TailorAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'tailor_id',
        'date',
        'clock_in',
        'clock_out',
        'working_hours',
        'meal_allowance',
        'status',
        'is_self_clocked',
        'note',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'working_hours' => 'integer',
            'meal_allowance' => 'integer',
            'is_self_clocked' => 'boolean',
        ];
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Tailor::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function slipLine(): HasOne
    {
        return $this->hasOne(PayoutSlipLine::class);
    }

    /**
     * Uang makan riil karyawan harian:
     * - Kerja >= 10 jam: Rp 35.000
     * - Kerja < 10 jam: Rp 30.000
     */
    public static function calculateMealAllowance(int $hours, string $status = 'present'): int
    {
        if ($status !== 'present') {
            return 0;
        }

        $under10 = (int) config('sewing.meal_allowance.under_10_hours', 30_000);
        $over10 = (int) config('sewing.meal_allowance.ten_hours_or_more', 35_000);

        return $hours >= 10 ? $over10 : $under10;
    }

    /**
     * Standar acuan harian KHUSUS perhitungan tarif sample artikel:
     * 9j = 241.400, 10j = 265.000, 11j = 295.000, 12j = 321.800
     */
    public static function standardBenchmarkRate(int $hours): int
    {
        $rates = (array) config('sewing.benchmark_standard_rates', [
            9 => 241_400,
            10 => 265_000,
            11 => 295_000,
            12 => 321_800,
        ]);

        return $rates[$hours] ?? 241_400;
    }

    public static function benchmarkRatePerMinute(int $hours): float
    {
        $dailyStandard = self::standardBenchmarkRate($hours);

        return $dailyStandard / ($hours * 60);
    }

    public static function allowanceForHours(int $hours): int
    {
        return self::calculateMealAllowance($hours);
    }

    public static function determineWorkingHours(?string $clockIn, ?string $clockOut): int
    {
        if (empty($clockIn) || empty($clockOut)) {
            return (int) config('sewing.default_working_hours', 9);
        }

        try {
            $in = Carbon::parse($clockIn);
            $out = Carbon::parse($clockOut);

            if ($out->lessThan($in)) {
                $out->addDay();
            }

            $diffHours = $in->diffInMinutes($out) / 60;

            if ($diffHours <= 9.5) {
                return 9;
            } elseif ($diffHours <= 10.5) {
                return 10;
            } elseif ($diffHours <= 11.5) {
                return 11;
            }

            return 12;
        } catch (\Throwable) {
            return (int) config('sewing.default_working_hours', 9);
        }
    }
}
