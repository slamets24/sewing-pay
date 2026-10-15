<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('channel')->nullable();
            $table->string('category')->nullable();
            $table->date('ordered_at')->nullable();
            $table->date('due_at')->nullable()->index();
            $table->boolean('is_opening_stock')->default(false);
            $table->text('source_text')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('work_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('article_id')->constrained()->restrictOnDelete();
            $table->foreignId('article_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->unsignedInteger('planned_qty');
            $table->unsignedInteger('received_qty')->default(0);
            $table->unsignedInteger('assigned_qty')->default(0);
            $table->unsignedInteger('delivered_qty')->default(0);
            $table->unsignedInteger('revision_hold_qty')->default(0);
            $table->timestamps();

            $table->index('article_id');
        });

        Schema::create('hancaan_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty');
            $table->dateTime('received_at')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hancaan_receipts');
        Schema::dropIfExists('work_order_items');
        Schema::dropIfExists('work_orders');
    }
};
