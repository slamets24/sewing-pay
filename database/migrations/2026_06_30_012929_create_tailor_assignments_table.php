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
        Schema::create('tailor_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->foreignId('production_article_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('assigned_qty');
            $table->unsignedInteger('completed_qty')->default(0);
            $table->unsignedInteger('defect_qty')->default(0);
            $table->unsignedInteger('revision_qty')->default(0);
            $table->unsignedInteger('unit_rate_amount');
            $table->string('status')->default('in_progress');
            $table->dateTime('assigned_at');
            $table->dateTime('due_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('assigned_at');
            $table->index(['tailor_id', 'status']);
            $table->index(['production_article_id', 'status']);
            $table->index(['status', 'assigned_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tailor_assignments');
    }
};
