<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->string('type')->default('internal')->after('name')->index();
            $table->foreignId('user_id')->nullable()->after('type')->unique()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('type');
        });
    }
};
