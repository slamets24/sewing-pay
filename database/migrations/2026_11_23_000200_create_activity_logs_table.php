<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Riwayat aktivitas: who did what, when. One `action` row per user action (a form submit, a login),
 * plus one row per record it created, changed or deleted, all sharing the same batch_id.
 * Names are copied in, so the history still reads right after a user, tailor or WO is deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_id')->index();
            $table->string('event', 20); // action | created | updated | deleted | login | logout | login_failed
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name')->nullable();
            $table->string('user_role')->nullable();
            $table->string('source', 20)->default('web'); // web | api | console | system
            $table->string('action')->nullable(); // route name or command
            $table->string('action_label')->nullable();
            $table->string('subject_type', 60)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_label')->nullable();
            $table->unsignedBigInteger('work_order_id')->nullable()->index();
            $table->unsignedBigInteger('tailor_id')->nullable()->index();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['subject_type', 'subject_id']);
            $table->index(['event', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
