<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Barang dari satu kiriman vendor yang sudah masuk gudang lagi. */
class VendorJobReturn extends Model
{
    protected $fillable = [
        'vendor_job_id',
        'qty',
        'returned_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'returned_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(VendorJob::class, 'vendor_job_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
