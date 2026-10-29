<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_slip_lines', function (Blueprint $table) {
            $table->foreignId('tailor_attendance_id')->nullable()->unique()->constrained()->restrictOnDelete()->after('revision_id');
        });
    }

    public function down(): void
    {
        Schema::table('payout_slip_lines', function (Blueprint $table) {
            $table->dropForeign(['tailor_attendance_id']);
            $table->dropColumn('tailor_attendance_id');
        });
    }
};
