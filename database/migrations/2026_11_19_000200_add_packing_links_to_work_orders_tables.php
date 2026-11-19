<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->unsignedBigInteger('packing_production_order_id')->nullable()->unique()->after('id');
            $table->timestamp('packing_synced_at')->nullable()->after('notes');
        });

        Schema::table('work_order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('packing_production_order_item_id')->nullable()->index()->after('work_order_id');
        });
    }

    public function down(): void
    {
        Schema::table('work_order_items', function (Blueprint $table) {
            $table->dropIndex(['packing_production_order_item_id']);
            $table->dropColumn('packing_production_order_item_id');
        });

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropUnique(['packing_production_order_id']);
            $table->dropColumn(['packing_production_order_id', 'packing_synced_at']);
        });
    }
};
