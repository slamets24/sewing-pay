<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A garment part that can be re-made with new material, e.g. "Badan depan", with its fixed price. */
class RevisionPart extends Model
{
    protected $fillable = [
        'name',
        'price',
        'material_type',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
