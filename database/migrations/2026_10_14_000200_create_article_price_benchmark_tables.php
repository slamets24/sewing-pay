<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_sewing_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->string('color', 60);
            $table->dateTime('started_at');
            $table->dateTime('finished_at');
            $table->unsignedInteger('duration_seconds');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['article_id', 'color']);
        });

        Schema::create('article_price_suggestions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('hourly_rate');
            $table->unsignedInteger('suggested_rate')->nullable();
            $table->json('payload');
            $table->dateTime('calculated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_price_suggestions');
        Schema::dropIfExists('article_sewing_samples');
    }
};
