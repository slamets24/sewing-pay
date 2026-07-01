<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Superadmin => 'Superadmin',
            self::Admin => 'Admin',
        };
    }

    public function homeRoute(): string
    {
        return match ($this) {
            self::Superadmin => 'dashboard',
            self::Admin => 'admin.mobile',
        };
    }
}