<?php

namespace App\Enums;

enum TailorAssignmentStatus: string
{
    case InProgress = 'in_progress';
    case Partial = 'partial';
    case Completed = 'completed';
    case Revision = 'revision';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::InProgress => 'Sedang Dikerjakan',
            self::Partial => 'Selesai Sebagian',
            self::Completed => 'Selesai',
            self::Revision => 'Revisi',
            self::Cancelled => 'Dibatalkan',
        };
    }
}
