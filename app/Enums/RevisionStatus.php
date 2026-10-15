<?php

namespace App\Enums;

enum RevisionStatus: string
{
    case WaitingMaterial = 'waiting_material';
    case MaterialReady = 'material_ready';
    case InProgress = 'in_progress';
    case Done = 'done';

    public function label(): string
    {
        return match ($this) {
            self::WaitingMaterial => 'Menunggu bahan',
            self::MaterialReady => 'Bahan datang',
            self::InProgress => 'Dikerjakan',
            self::Done => 'Selesai',
        };
    }

    public function next(): ?self
    {
        return match ($this) {
            self::WaitingMaterial => self::MaterialReady,
            self::MaterialReady => self::InProgress,
            self::InProgress => self::Done,
            self::Done => null,
        };
    }
}
