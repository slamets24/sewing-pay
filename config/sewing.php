<?php

return [

    /*
    | Acuan standar nilai harian untuk perhitungan patokan tarif artikel baru (sample).
    | Formula: (durasi jahit / (jam acuan * 3600)) * standar nilai harian.
    | 9 jam  = 241.400 (Rp 26.822/jam, Rp 447,04/menit)
    | 10 jam = 265.000 (Rp 26.500/jam, Rp 441,67/menit)
    | 11 jam = 295.000 (Rp 26.818/jam, Rp 446,97/menit)
    | 12 jam = 321.800 (Rp 26.817/jam, Rp 446,94/menit)
    */
    'benchmark_standard_rates' => [
        9 => 241_400,
        10 => 265_000,
        11 => 295_000,
        12 => 321_800,
    ],

    // Alias for backward compatibility
    'shift_rates' => [
        9 => 241_400,
        10 => 265_000,
        11 => 295_000,
        12 => 321_800,
    ],

    'default_working_hours' => 9,

    'benchmark_hourly_rate' => 26_000,

    /*
    | Aturan Uang Makan Riil Karyawan Jahit Harian:
    | - Kerja >= 10 jam (di atas/mulai 10 jam): Rp 35.000 / hari
    | - Kerja < 10 jam (di bawah 10 jam): Rp 30.000 / hari
    */
    'meal_allowance' => [
        'under_10_hours' => 30_000,
        'ten_hours_or_more' => 35_000,
    ],

];
