<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->unsignedBigInteger('hr_employee_id')->nullable()->unique()->after('user_id');
            $table->string('hr_employee_number', 50)->nullable()->index()->after('hr_employee_id');
            $table->string('gender', 20)->nullable()->after('hr_employee_number');
            $table->string('employment_status', 50)->nullable()->after('gender');
        });
    }

    public function down(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->dropUnique(['hr_employee_id']);
            $table->dropIndex(['hr_employee_number']);
            $table->dropColumn(['hr_employee_id', 'hr_employee_number', 'gender', 'employment_status']);
        });
    }
};
