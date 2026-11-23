<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * sewing_settings: aturan yang bisa diubah admin tanpa deploy (contoh: uang makan per masa kerja).
     * target_days: tanggal yang ditandai hari target, penjahit wajib hadir dari jam mulai sampai jam selesai.
     */
    public function up(): void
    {
        Schema::create('sewing_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('target_days', function (Blueprint $table): void {
            $table->id();
            $table->date('date')->unique();
            $table->time('start_time');
            $table->time('end_time');
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_days');
        Schema::dropIfExists('sewing_settings');
    }
};
