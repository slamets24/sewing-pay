<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;

/**
 * One-time data fix: work picked up while an article still had no rate (Rp0, typical for packingv2 imports)
 * and not paid yet now gets the article's current rate. Paid slips and makloon payments are left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('sewing:apply-article-rates');
    }

    public function down(): void
    {
        // Data fix only; nothing to roll back.
    }
};
