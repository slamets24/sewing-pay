<?php

namespace App\Enums;

enum PayoutLineType: string
{
    case Sewing = 'sewing';
    case Revision = 'revision';

    public function label(): string
    {
        return match ($this) {
            self::Sewing => 'Jahit',
            self::Revision => 'Revisi bahan',
        };
    }
}
