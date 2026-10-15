<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payouts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->date('cutoff_date');
            $table->string('status')->default('draft')->index();
            $table->unsignedInteger('total_tailors')->default(0);
            $table->unsignedInteger('total_qty')->default(0);
            $table->unsignedInteger('total_amount')->default(0);
            $table->dateTime('generated_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('payout_slips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tailor_id')->constrained()->restrictOnDelete();
            $table->string('invoice_number')->unique();
            $table->string('public_token')->unique();
            $table->string('status')->default('draft');
            $table->unsignedInteger('qty')->default(0);
            $table->unsignedInteger('gross_amount')->default(0);
            $table->unsignedInteger('bonus_amount')->default(0);
            $table->unsignedInteger('deduction_amount')->default(0);
            $table->unsignedInteger('net_amount')->default(0);
            $table->text('notes')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['payout_id', 'tailor_id']);
        });

        Schema::create('payout_slip_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payout_slip_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->foreignId('sewing_delivery_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->foreignId('revision_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->string('description');
            $table->string('color')->nullable();
            $table->string('size')->nullable();
            $table->unsignedInteger('qty');
            $table->unsignedInteger('rate');
            $table->unsignedInteger('subtotal');
            $table->dateTime('occurred_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_slip_lines');
        Schema::dropIfExists('payout_slips');
        Schema::dropIfExists('payouts');
    }
};
