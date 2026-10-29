<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('article_sewing_samples', function (Blueprint $table) {
            $table->unsignedTinyInteger('working_hours')->default(9)->after('tailor_id');
            $table->unsignedInteger('meal_allowance')->default(241400)->after('working_hours');
            $table->dateTime('started_at')->nullable()->change();
            $table->dateTime('finished_at')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('article_sewing_samples', function (Blueprint $table) {
            $table->dropColumn(['working_hours', 'meal_allowance']);
        });
    }
};
