<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kasbon warung dan kasbon mingguan diinput admin per slip, dipisah dari potongan lain.
     */
    public function up(): void
    {
        if (Schema::hasColumn('payout_slips', 'kasbon_warung_amount')) {
            return;
        }

        Schema::table('payout_slips', function (Blueprint $table): void {
            $table->unsignedInteger('kasbon_warung_amount')->default(0)->after('deduction_amount');
            $table->unsignedInteger('kasbon_mingguan_amount')->default(0)->after('kasbon_warung_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payout_slips', function (Blueprint $table): void {
            $table->dropColumn(['kasbon_warung_amount', 'kasbon_mingguan_amount']);
        });
    }
};
