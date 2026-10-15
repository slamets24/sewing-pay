<?php

namespace App\Enums;

enum RevisionFoundAt: string
{
    case Sewing = 'sewing';
    case Qc = 'qc';

    public function label(): string
    {
        return match ($this) {
            self::Sewing => 'Saat dijahit',
            self::Qc => 'Dari QC',
        };
    }
}
