<?php

namespace Database\Seeders;

use App\Models\RevisionPart;
use Illuminate\Database\Seeder;

/** Starting price list for material revisions. The owner adjusts the real prices in "Bagian revisi". */
class RevisionPartSeeder extends Seeder
{
    public function run(): void
    {
        $parts = [
            ['name' => 'Badan Belakang', 'price' => 10000],
            ['name' => 'Badan Depan', 'price' => 10000],
            ['name' => 'Ganti Kerah', 'price' => 5000],
            ['name' => 'Ganti Label', 'price' => 3400],
            ['name' => 'Ganti Manset', 'price' => 5000],
            ['name' => 'Ganti Tangan', 'price' => 6000],
            ['name' => 'Ganti Tangan Demo', 'price' => 6000],
            ['name' => 'Rok', 'price' => 5000],
        ];

        foreach ($parts as $part) {
            RevisionPart::query()->firstOrCreate(
                ['name' => $part['name']],
                ['price' => $part['price'], 'material_type' => 'print', 'is_active' => true],
            );
        }
    }
}
