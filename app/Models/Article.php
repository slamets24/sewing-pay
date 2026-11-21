<?php

namespace App\Models;

use App\Enums\ArticleSource;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Article extends Model
{
    use HasFactory;

    protected $fillable = [
        'source',
        'packing_article_id',
        'name',
        'brand_name',
        'category_name',
        'fabric_type',
        'processes',
        'sewing_rate',
        'makloon_sewing_rate',
        'is_active',
        'notes',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'source' => ArticleSource::class,
            'packing_article_id' => 'integer',
            'processes' => 'array',
            'sewing_rate' => 'integer',
            'makloon_sewing_rate' => 'integer',
            'is_active' => 'boolean',
            'synced_at' => 'datetime',
        ];
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ArticleVariant::class);
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(ArticleAlias::class);
    }

    public function workOrderItems(): HasMany
    {
        return $this->hasMany(WorkOrderItem::class);
    }

    public function sewingSamples(): HasMany
    {
        return $this->hasMany(ArticleSewingSample::class);
    }

    public function priceSuggestion(): HasOne
    {
        return $this->hasOne(ArticlePriceSuggestion::class);
    }

    /** Effective rate for makloon tailors; 0 / empty means "same as the internal rate". */
    public function makloonRate(): int
    {
        return $this->makloon_sewing_rate ?: $this->sewing_rate;
    }

    /** Name as shown everywhere: just the article name. Category has its own field. */
    public function displayName(): string
    {
        return trim($this->name);
    }

    /**
     * Proses tambahan dari packingv2, dirapikan: teks tanpa spasi berlebih, tanpa duplikat, urutan tetap.
     *
     * @return list<string>
     */
    public static function normalizeProcesses(mixed $processes): array
    {
        if (! is_array($processes)) {
            return [];
        }

        $names = [];

        foreach ($processes as $process) {
            $name = trim((string) preg_replace('/\s+/', ' ', (string) $process));

            if ($name !== '' && ! in_array(mb_strtolower($name), array_map('mb_strtolower', $names), true)) {
                $names[] = mb_substr($name, 0, 60);
            }
        }

        return $names;
    }

    /**
     * Proses tambahan artikel (Bordir, Prisket, ...) sesuai urutan; kosong berarti langsung jahit.
     *
     * @return list<string>
     */
    public function processNames(): array
    {
        return self::normalizeProcesses($this->processes);
    }

    /** Jenis kain packingv2 ('polos' / 'print') diterjemahkan ke jenis baris WO ('polosan' / 'print'). */
    public static function itemTypeForFabric(?string $fabricType): ?string
    {
        return match ($fabricType) {
            'polos' => 'polosan',
            'print' => 'print',
            default => null,
        };
    }
}
