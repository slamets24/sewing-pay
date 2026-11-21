<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Proses tambahan setelah cutting dari packingv2 (mis. ["Bordir", "Prisket"]), urut sesuai pengerjaan.
     */
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->json('processes')->nullable()->after('fabric_type');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table): void {
            $table->dropColumn('processes');
        });
    }
};
