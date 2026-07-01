<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payroll_slips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_period_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('public_token')->unique();
            $table->string('status')->default('draft');
            $table->unsignedInteger('completed_qty')->default(0);
            $table->unsignedInteger('gross_amount')->default(0);
            $table->unsignedInteger('bonus_amount')->default(0);
            $table->unsignedInteger('deduction_amount')->default(0);
            $table->unsignedInteger('net_amount')->default(0);
            $table->dateTime('generated_at')->nullable();
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'tailor_id']);
            $table->index('status');
            $table->index(['tailor_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_slips');
    }
};
