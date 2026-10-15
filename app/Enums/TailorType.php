<?php

namespace App\Enums;

enum TailorType: string
{
    case Internal = 'internal';
    case Makloon = 'makloon';

    public function label(): string
    {
        return match ($this) {
            self::Internal => 'Internal',
            self::Makloon => 'Makloon',
        };
    }

    /** Makloon work is only tracked for location; its pricing is handled outside this app. */
    public function isPaidHere(): bool
    {
        return $this === self::Internal;
    }
}
