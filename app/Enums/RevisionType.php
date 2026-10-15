<?php

namespace App\Enums;

enum RevisionType: string
{
    case Sewing = 'sewing';
    case Material = 'material';

    public function label(): string
    {
        return match ($this) {
            self::Sewing => 'Revisi jahit',
            self::Material => 'Revisi bahan',
        };
    }

    public function initialStatus(): RevisionStatus
    {
        return match ($this) {
            self::Sewing => RevisionStatus::InProgress,
            self::Material => RevisionStatus::WaitingMaterial,
        };
    }

    /** Sewing fixes are the tailor's own mistake, so they are never paid. */
    public function isPaid(): bool
    {
        return $this === self::Material;
    }
}
