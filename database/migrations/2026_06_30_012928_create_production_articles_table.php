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
        Schema::create('production_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('article_name');
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->unsignedInteger('planned_qty');
            $table->unsignedInteger('available_qty');
            $table->unsignedInteger('assigned_qty')->default(0);
            $table->unsignedInteger('completed_qty')->default(0);
            $table->string('status')->default('ready');
            $table->date('ready_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('article_name');
            $table->index(['status', 'created_at']);
            $table->index(['article_name', 'color', 'size']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_articles');
    }
};
