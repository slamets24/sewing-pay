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
            self::Admin => 'Admin Gudang',
            self::Qc => 'QC',
            self::Tailor => 'Penjahit',
        };
    }

    public function homeRoute(): string
    {
        return match ($this) {
            self::Superadmin, self::Admin => 'dashboard',
            self::Qc => 'revisions.index',
            // Tailors do not sign in. Their portal is a private link.
            self::Tailor => 'login',
        };
    }

    /** Staff roles run the workshop. Tailors use a PIN link, not this account list. */
    public function isStaff(): bool
    {
        return $this !== self::Tailor;
    }
}
