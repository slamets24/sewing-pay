<?php

namespace App\Enums;

enum UserRole: string
{
    case Superadmin = 'superadmin';
    case Admin = 'admin';
    case Qc = 'qc';
    case Tailor = 'penjahit';

    public function label(): string
    {
        return match ($this) {
            self::Superadmin => 'Owner',
            self::Admin => 'Admin Divisi Jahit',
            self::Qc => 'QC (Tanpa Akses)',
            self::Tailor => 'Penjahit',
        };
    }

    public function homeRoute(): string
    {
        return match ($this) {
            self::Superadmin, self::Admin => 'dashboard',
            self::Qc, self::Tailor => 'login',
        };
    }

    /** Staff roles for internal sewing division accounts. QC is an external division with no app access. */
    public function isStaff(): bool
    {
        return in_array($this, [self::Superadmin, self::Admin], true);
    }
}
