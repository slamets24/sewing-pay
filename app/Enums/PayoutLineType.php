<?php

namespace App\Enums;

enum PayoutLineType: string
{
    case Sewing = 'sewing';
    case Revision = 'revision';
    case MealAllowance = 'meal_allowance';

    public function label(): string
    {
        return match ($this) {
            self::Sewing => 'Jahit',
            self::Revision => 'Revisi bahan',
            self::MealAllowance => 'Uang makan',
        };
    }
}
