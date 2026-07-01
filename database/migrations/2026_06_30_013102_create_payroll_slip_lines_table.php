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
        Schema::create('payroll_slip_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_slip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tailor_assignment_completion_id')->constrained()->restrictOnDelete()->unique();
            $table->foreignId('production_article_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('work_type_id')->nullable()->constrained()->nullOnDelete();
            $table->string('article_name');
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->string('work_type_name');
            $table->unsignedInteger('completed_qty');
            $table->unsignedInteger('unit_rate_amount');
            $table->unsignedInteger('subtotal_amount');
            $table->dateTime('completed_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('completed_at');
            $table->index(['payroll_slip_id', 'completed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_slip_lines');
    }
};
