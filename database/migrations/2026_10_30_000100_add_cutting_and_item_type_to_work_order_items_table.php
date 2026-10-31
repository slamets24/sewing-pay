<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_order_items', function (Blueprint $table) {
            $table->string('item_type')->default('print')->after('size');
            $table->unsignedInteger('cutting_qty')->default(0)->after('planned_qty');
        });

        DB::table('work_order_items')->update([
            'cutting_qty' => DB::raw('received_qty'),
        ]);

        Schema::create('cutting_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_item_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('qty');
            $table->dateTime('transferred_at')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cutting_receipts');

        Schema::table('work_order_items', function (Blueprint $table) {
            $table->dropColumn(['item_type', 'cutting_qty']);
        });
    }
};
