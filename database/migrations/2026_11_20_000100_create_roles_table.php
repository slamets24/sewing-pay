<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Roles become master data. users.role keeps holding the role slug, so existing accounts keep working;
 * the four built-in roles are created here with the access they had before (Admin gets its old menu).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->boolean('can_login')->default(true);
            $table->json('abilities')->nullable();
            $table->timestamps();
        });

        $now = now();

        // Literal values on purpose: a migration must not change meaning if the Ability enum is edited later.
        $adminAbilities = [
            'dashboard.view', 'desk.use', 'pickups.manage', 'deliveries.manage',
            'work-orders.view', 'work-orders.manage', 'cutting.manage', 'hancaan.manage',
            'production-reports.view', 'qc-shipments.manage', 'revisions.manage', 'attendances.manage',
            'articles.view', 'articles.create', 'users.manage',
        ];

        DB::table('roles')->insert([
            ['slug' => 'superadmin', 'name' => 'Owner', 'description' => 'Akses penuh sistem', 'is_system' => true, 'can_login' => true, 'abilities' => json_encode([]), 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'admin', 'name' => 'Admin Divisi Jahit', 'description' => 'Operasional harian jahit', 'is_system' => true, 'can_login' => true, 'abilities' => json_encode($adminAbilities), 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'qc', 'name' => 'QC (Tanpa Akses)', 'description' => 'Divisi QC, tidak bisa masuk aplikasi', 'is_system' => true, 'can_login' => false, 'abilities' => json_encode([]), 'created_at' => $now, 'updated_at' => $now],
            ['slug' => 'penjahit', 'name' => 'Penjahit', 'description' => 'Masuk lewat Portal Karyawan HR', 'is_system' => true, 'can_login' => false, 'abilities' => json_encode([]), 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
