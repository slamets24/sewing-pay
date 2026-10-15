<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revision_parts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedInteger('price');
            $table->string('material_type')->default('print');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('revisions', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('status')->index();
            $table->string('found_at');
            $table->foreignId('work_order_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('sewing_delivery_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('pickup_item_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('returned_to_warehouse')->default(false);
            $table->dateTime('hold_released_at')->nullable();
            $table->foreignId('revision_part_id')->nullable()->constrained()->nullOnDelete();
            $table->string('part_name')->nullable();
            $table->string('material_type')->nullable();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('rate')->default(0);
            $table->unsignedInteger('subtotal')->default(0);
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reported_at');
            $table->dateTime('material_ready_at')->nullable();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tailor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revisions');
        Schema::dropIfExists('revision_parts');
    }
};
