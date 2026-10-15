<?php

namespace App\Enums;

/** Where most of a work order line currently sits, derived from its qty counters. */
enum WorkOrderItemStage: string
{
    case OtherDivision = 'other_division';
    case Ready = 'ready';
    case Sewing = 'sewing';
    case WaitingRevision = 'waiting_revision';
    case Done = 'done';

    public function label(): string
    {
        return match ($this) {
            self::OtherDivision => 'Di divisi lain',
            self::Ready => 'Siap diambil',
            self::Sewing => 'Sedang dijahit',
            self::WaitingRevision => 'Menunggu revisi bahan',
            self::Done => 'Selesai jahit',
        };
    }
}
