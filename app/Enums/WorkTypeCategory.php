<?php

namespace App\Enums;

enum WorkTypeCategory: string
{
    case Regular = 'regular';
    case Revision = 'revision';
    case Sample = 'sample';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Regular => 'Reguler',
            self::Revision => 'Revisi',
            self::Sample => 'Sample',
            self::Other => 'Lainnya',
        };
    }
}
