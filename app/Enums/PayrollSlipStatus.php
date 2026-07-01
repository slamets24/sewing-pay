<?php

namespace App\Enums;

enum PayrollSlipStatus: string
{
    case Draft = 'draft';
    case Sent = 'sent';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Sent => 'Terkirim',
            self::Paid => 'Dibayar',
        };
    }
}
