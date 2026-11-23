<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pengaturan OPSEW yang bisa diubah admin dari aplikasi, disimpan per key sebagai JSON.
 */
class SewingSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function valueOf(string $key): ?array
    {
        $value = self::query()->where('key', $key)->first()?->value;

        return is_array($value) ? $value : null;
    }

    /**
     * @param  array<string, mixed>  $value
     */
    public static function store(string $key, array $value, ?int $userId = null): void
    {
        self::query()->updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $userId]);
    }
}
