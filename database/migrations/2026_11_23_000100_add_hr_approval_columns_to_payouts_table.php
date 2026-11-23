<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persetujuan HR atas pencairan gaji: draft dikirim ke hr-azzahra, HR acc (boleh sambil mengubah bonus/kasbon/potongan)
     * atau mengembalikan dengan catatan. Slip baru boleh ditandai dibayar setelah HR acc.
     */
    public function up(): void
    {
        Schema::table('payouts', function (Blueprint $table): void {
            $table->string('hr_status', 20)->nullable()->after('status');
            $table->timestamp('hr_submitted_at')->nullable()->after('hr_status');
            $table->timestamp('hr_decided_at')->nullable()->after('hr_submitted_at');
            $table->string('hr_decided_by')->nullable()->after('hr_decided_at');
            $table->text('hr_note')->nullable()->after('hr_decided_by');
        });
    }

    public function down(): void
    {
        Schema::table('payouts', function (Blueprint $table): void {
            $table->dropColumn(['hr_status', 'hr_submitted_at', 'hr_decided_at', 'hr_decided_by', 'hr_note']);
        });
    }
};
