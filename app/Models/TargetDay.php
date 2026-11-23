<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Hari target: penjahit wajib hadir dari start_time sampai end_time. Yang tidak memenuhi dipotong uang makannya.
 */
class TargetDay extends Model
{
    protected $fillable = [
        'date',
        'start_time',
        'end_time',
        'note',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function startClock(): string
    {
        return substr((string) $this->start_time, 0, 5);
    }

    public function endClock(): string
    {
        return substr((string) $this->end_time, 0, 5);
    }
}
