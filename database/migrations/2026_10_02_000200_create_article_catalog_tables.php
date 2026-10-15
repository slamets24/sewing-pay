<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->string('source')->default('manual');
            $table->unsignedBigInteger('packing_article_id')->nullable()->unique();
            $table->string('name')->index();
            $table->string('brand_name')->nullable();
            $table->string('category_name')->nullable();
            $table->unsignedInteger('sewing_rate')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->text('notes')->nullable();
            $table->dateTime('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('article_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('packing_master_barcode_id')->nullable()->unique();
            $table->string('barcode_value')->nullable()->index();
            $table->string('item_type')->nullable();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->unsignedSmallInteger('size_sort')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['article_id', 'color', 'size']);
        });

        Schema::create('article_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained()->cascadeOnDelete();
            $table->string('alias')->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_aliases');
        Schema::dropIfExists('article_variants');
        Schema::dropIfExists('articles');
    }
};
