<?php

namespace App\Enums;

enum ArticleSource: string
{
    case Manual = 'manual';
    case Packingv2 = 'packingv2';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Manual',
            self::Packingv2 => 'packingv2',
        };
    }
}
