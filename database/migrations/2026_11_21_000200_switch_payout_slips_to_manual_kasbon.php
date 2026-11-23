<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Versi awal migrasi 000100 sempat membuat kolom kasbon otomatis dari HR (kasbon_amount dkk).
     * Kasbon sekarang diinput manual di OPSEW, jadi kolom lama dibuang dan kolom warung/mingguan dipastikan ada.
     */
    public function up(): void
    {
        $oldColumns = array_values(array_filter(
            ['kasbon_amount', 'kasbon_deductions', 'kasbon_reported_at'],
            fn (string $column): bool => Schema::hasColumn('payout_slips', $column),
        ));

        if ($oldColumns !== []) {
            Schema::table('payout_slips', function (Blueprint $table) use ($oldColumns): void {
                $table->dropColumn($oldColumns);
            });
        }

        if (! Schema::hasColumn('payout_slips', 'kasbon_warung_amount')) {
            Schema::table('payout_slips', function (Blueprint $table): void {
                $table->unsignedInteger('kasbon_warung_amount')->default(0)->after('deduction_amount');
                $table->unsignedInteger('kasbon_mingguan_amount')->default(0)->after('kasbon_warung_amount');
            });
        }
    }

    public function down(): void
    {
        // Tidak ada yang dikembalikan; kolom warung/mingguan dihapus oleh rollback migrasi 000100.
    }
};
