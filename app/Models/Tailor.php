<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tailor extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'whatsapp_number',
        'address',
        'is_active',
        'joined_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'joined_at' => 'date',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TailorAssignment::class);
    }

    public function completions(): HasMany
    {
        return $this->hasMany(TailorAssignmentCompletion::class);
    }
}
