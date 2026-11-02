<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->unsignedInteger('makloon_sewing_rate')->nullable()->after('sewing_rate');
        });

        Schema::create('makloon_payments', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('tailor_id')->constrained('tailors')->restrictOnDelete();
            $table->date('payment_date');
            $table->dateTime('paid_at')->nullable();
            $table->string('status')->default('paid')->index();
            $table->unsignedInteger('total_qty')->default(0);
            $table->unsignedInteger('gross_amount')->default(0);
            $table->integer('adjustment_amount')->default(0);
            $table->unsignedInteger('net_amount')->default(0);
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('makloon_payment_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('makloon_payment_id')->constrained('makloon_payments')->cascadeOnDelete();
            $table->foreignId('sewing_delivery_id')->unique()->constrained('sewing_deliveries')->restrictOnDelete();
            $table->foreignId('work_order_item_id')->nullable()->constrained('work_order_items')->nullOnDelete();
            $table->string('description');
            $table->string('wo_number')->nullable();
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('rate');
            $table->unsignedInteger('subtotal');
            $table->dateTime('delivered_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('makloon_payment_lines');
        Schema::dropIfExists('makloon_payments');
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('makloon_sewing_rate');
        });
    }
};
