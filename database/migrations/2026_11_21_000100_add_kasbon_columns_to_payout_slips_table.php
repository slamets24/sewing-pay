<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Potongan kasbon dari hr-azzahra per slip: total, rincian per kasbon, dan kapan sudah dicatat di HR.
     */
    public function up(): void
    {
        Schema::table('payout_slips', function (Blueprint $table): void {
            $table->unsignedInteger('kasbon_amount')->default(0)->after('deduction_amount');
            $table->json('kasbon_deductions')->nullable()->after('kasbon_amount');
            $table->timestamp('kasbon_reported_at')->nullable()->after('kasbon_deductions');
        });
    }

    public function down(): void
    {
        Schema::table('payout_slips', function (Blueprint $table): void {
            $table->dropColumn(['kasbon_amount', 'kasbon_deductions', 'kasbon_reported_at']);
        });
    }
};
