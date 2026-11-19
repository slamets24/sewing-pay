<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UserSeeder extends Seeder
{
    /**
     * Creates the Owner and one Admin account if they don't exist yet. Existing accounts are never touched.
     *
     * The password comes from SEED_USER_PASSWORD. Outside production it falls back to "password" for local demo use;
     * in production the seeder refuses to run without it, so a well-known password never reaches a live database.
     */
    public function run(): void
    {
        $password = (string) config('sewing.seed_user_password');

        if ($password === '') {
            if (app()->isProduction()) {
                throw new RuntimeException('Set SEED_USER_PASSWORD before seeding users in production.');
            }

            $password = 'password';
        }

        User::query()->firstOrCreate(['email' => 'superadmin@opsew.com'], [
            'name' => 'Superadmin',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
            'role' => UserRole::Superadmin,
        ]);

        User::query()->firstOrCreate(['email' => 'admin@opsew.com'], [
            'name' => 'Admin',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
            'role' => UserRole::Admin,
        ]);
    }
}
