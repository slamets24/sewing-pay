<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Tailor;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
                'role' => UserRole::Superadmin,
            ]
        );

        Tailor::query()->firstOrCreate(
            ['code' => 'PNJ-DEMO'],
            [
                'name' => 'Penjahit Demo',
                'whatsapp_number' => '6281200000000',
                'is_active' => true,
            ]
        );

        $workTypes = [
            ['code' => 'REG-KEMEJA', 'name' => 'Jahit Kemeja', 'category' => 'regular', 'rate_amount' => 7000],
            ['code' => 'REV-KERAH', 'name' => 'Revisi Ganti Kerah', 'category' => 'revision', 'rate_amount' => 5000],
            ['code' => 'REV-MANSET', 'name' => 'Revisi Ganti Manset', 'category' => 'revision', 'rate_amount' => 5000],
            ['code' => 'REV-TANGAN', 'name' => 'Revisi Ganti Tangan', 'category' => 'revision', 'rate_amount' => 6000],
            ['code' => 'REV-BADAN-DEPAN', 'name' => 'Revisi Badan Depan', 'category' => 'revision', 'rate_amount' => 10000],
            ['code' => 'REV-BADAN-BELAKANG', 'name' => 'Revisi Badan Belakang', 'category' => 'revision', 'rate_amount' => 10000],
            ['code' => 'REV-ROK', 'name' => 'Revisi Rok', 'category' => 'revision', 'rate_amount' => 5000],
            ['code' => 'REV-LABEL', 'name' => 'Revisi Ganti Label', 'category' => 'revision', 'rate_amount' => 3400],
        ];

        foreach ($workTypes as $workType) {
            WorkType::query()->firstOrCreate(
                ['code' => $workType['code']],
                [
                    'name' => $workType['name'],
                    'category' => $workType['category'],
                    'unit' => 'pcs',
                    'rate_amount' => $workType['rate_amount'],
                    'is_active' => true,
                    'source' => 'excel_reference_seed',
                ]
            );
        }

        if (app()->environment('local')) {
            $this->call(OperationalDemoSeeder::class);
        }
    }
}
