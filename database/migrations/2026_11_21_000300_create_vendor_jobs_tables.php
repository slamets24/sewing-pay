<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Proses vendor setelah cutting (Bordir, Prisket, ...): hancaan keluar gudang ke vendor lalu masuk gudang lagi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_items', function (Blueprint $table) {
            // Proses yang wajib dilewati baris ini sebelum dijahit, disalin dari artikel saat baris dibuat.
            $table->json('processes')->nullable()->after('item_type');
        });

        Schema::create('vendor_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_item_id')->constrained('work_order_items')->cascadeOnDelete();
            $table->string('process', 60);
            $table->string('vendor_name', 120);
            $table->unsignedInteger('qty');
            $table->unsignedInteger('returned_qty')->default(0);
            $table->dateTime('sent_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['work_order_item_id', 'process']);
        });

        Schema::create('vendor_job_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_job_id')->constrained('vendor_jobs')->cascadeOnDelete();
            $table->unsignedInteger('qty');
            $table->dateTime('returned_at');
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Admin divisi jahit ikut mendapat ability baru ini (nilai literal, sama seperti migrasi roles).
        $admin = DB::table('roles')->where('slug', 'admin')->first();

        if ($admin) {
            $abilities = json_decode((string) $admin->abilities, true) ?: [];

            if (! in_array('vendor-process.manage', $abilities, true)) {
                // Letakkan setelah "Terima hancaan", sama dengan urutan katalog ability.
                $position = array_search('hancaan.manage', $abilities, true);
                array_splice($abilities, $position === false ? count($abilities) : $position + 1, 0, ['vendor-process.manage']);
                DB::table('roles')->where('id', $admin->id)->update(['abilities' => json_encode(array_values($abilities)), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_job_returns');
        Schema::dropIfExists('vendor_jobs');

        Schema::table('work_order_items', function (Blueprint $table) {
            $table->dropColumn('processes');
        });
    }
};
