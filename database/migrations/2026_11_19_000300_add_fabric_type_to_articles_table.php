<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Jenis kain dari packingv2 (polos / print), dipakai sebagai bawaan jenis baris WO. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->string('fabric_type', 10)->nullable()->after('category_name');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('fabric_type');
        });
    }
};
