<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->dateTime('picked_at')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('pickup_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pickup_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_order_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('delivered_qty')->default(0);
            $table->unsignedInteger('sewing_rate');
            $table->string('status')->default('open');
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['tailor_id', 'status']);
            $table->index(['work_order_item_id', 'status']);
        });

        Schema::create('qc_shipments', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->dateTime('sent_at')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('sewing_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pickup_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_order_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('sewing_rate');
            $table->unsignedInteger('subtotal');
            $table->boolean('is_payable')->default(true);
            $table->dateTime('delivered_at')->index();
            $table->foreignId('qc_shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tailor_id', 'delivered_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sewing_deliveries');
        Schema::dropIfExists('qc_shipments');
        Schema::dropIfExists('pickup_items');
        Schema::dropIfExists('pickups');
    }
};
