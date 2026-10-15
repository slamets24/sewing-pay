<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->string('portal_token', 64)->nullable()->unique()->after('user_id');
            $table->string('portal_pin')->nullable()->after('portal_token');
            $table->timestamp('portal_pin_changed_at')->nullable()->after('portal_pin');
        });
    }

    public function down(): void
    {
        Schema::table('tailors', function (Blueprint $table) {
            $table->dropColumn(['portal_token', 'portal_pin', 'portal_pin_changed_at']);
        });
    }
};
