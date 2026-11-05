<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate(['email' => 'test@example.com'], [
            'name' => 'Owner',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'role' => UserRole::Superadmin,
        ]);

        User::query()->firstOrCreate(['email' => 'admin@example.com'], [
            'name' => 'Admin',
            'email_verified_at' => now(),
            'password' => Hash::make('password'),
            'role' => UserRole::Admin,
        ]);
    }
}
