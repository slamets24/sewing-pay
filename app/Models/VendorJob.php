<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu kiriman hancaan dari gudang ke vendor untuk satu proses (mis. Bordir di CV Maju).
 * `returned_qty` = yang sudah kembali masuk gudang; sisanya masih di vendor.
 */
class VendorJob extends Model
{
    protected $fillable = [
        'work_order_item_id',
        'process',
        'vendor_name',
        'qty',
        'returned_qty',
        'sent_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'returned_qty' => 'integer',
            'sent_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(WorkOrderItem::class, 'work_order_item_id');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(VendorJobReturn::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Masih di vendor, belum kembali ke gudang. */
    public function openQty(): int
    {
        return max(0, $this->qty - $this->returned_qty);
    }

    public function isOpen(): bool
    {
        return $this->openQty() > 0;
    }
}
