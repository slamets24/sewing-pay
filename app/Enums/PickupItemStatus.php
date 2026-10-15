<?php

namespace App\Enums;

enum PickupItemStatus: string
{
    case Open = 'open';
    case Done = 'done';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Sedang dijahit',
            self::Done => 'Sudah disetor',
            self::Cancelled => 'Dibatalkan',
        };
    }
}
