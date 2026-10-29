<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tailor_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tailor_id')->constrained()->cascadeOnDelete();
            $table->date('date')->index();
            $table->time('clock_in')->nullable();
            $table->time('clock_out')->nullable();
            $table->unsignedTinyInteger('working_hours')->default(9);
            $table->unsignedInteger('meal_allowance')->default(241400);
            $table->string('status', 20)->default('present'); // present, permission, sick, alpha, off
            $table->boolean('is_self_clocked')->default(false);
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tailor_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tailor_attendances');
    }
};
