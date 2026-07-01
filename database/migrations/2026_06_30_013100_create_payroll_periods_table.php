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
        Schema::create('payroll_periods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->date('starts_at');
            $table->date('ends_at');
            $table->string('status')->default('draft');
            $table->unsignedInteger('total_tailors')->default(0);
            $table->unsignedInteger('total_completed_qty')->default(0);
            $table->unsignedInteger('total_amount')->default(0);
            $table->dateTime('generated_at')->nullable();
            $table->dateTime('locked_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['starts_at', 'ends_at']);
            $table->index('status');
            $table->index(['starts_at', 'ends_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_periods');
    }
};
