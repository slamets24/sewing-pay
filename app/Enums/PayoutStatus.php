<?php

namespace App\Enums;

enum PayoutStatus: string
{
    case Draft = 'draft';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Paid => 'Sudah dibayar',
        };
    }
}
