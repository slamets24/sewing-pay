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
        Schema::create('tailor_assignment_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_assignment_id')->constrained()->restrictOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->foreignId('production_article_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('completed_qty');
            $table->unsignedInteger('defect_qty')->default(0);
            $table->unsignedInteger('revision_qty')->default(0);
            $table->unsignedInteger('unit_rate_amount');
            $table->unsignedInteger('subtotal_amount');
            $table->dateTime('completed_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('completed_at');
            $table->index(['tailor_id', 'completed_at']);
            $table->index(['completed_at', 'tailor_id']);
            $table->index(['work_type_id', 'completed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tailor_assignment_completions');
    }
};
