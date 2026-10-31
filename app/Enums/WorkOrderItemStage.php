<?php

namespace App\Enums;

/** Where most of a work order line currently sits, derived from its qty counters. */
enum WorkOrderItemStage: string
{
    case Printing = 'printing';
    case Cutting = 'cutting';
    case OtherDivision = 'other_division';
    case Ready = 'ready';
    case InternalSewing = 'internal_sewing';
    case MakloonSewing = 'makloon_sewing';
    case Sewing = 'sewing';
    case WaitingRevision = 'waiting_revision';
    case Done = 'done';

    public function label(): string
    {
        return match ($this) {
            self::Printing => 'Di printing',
            self::Cutting => 'Di cutting',
            self::OtherDivision => 'Di divisi lain',
            self::Ready => 'Siap diambil',
            self::InternalSewing => 'Di penjahit',
            self::MakloonSewing => 'Di makloon',
            self::Sewing => 'Sedang dijahit',
            self::WaitingRevision => 'Menunggu revisi bahan',
            self::Done => 'Selesai jahit',
        };
    }
}
