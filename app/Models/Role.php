<?php

namespace App\Models;

use App\Enums\Ability;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A named set of abilities. Users point at a role by slug (users.role), so the slug never changes after creation.
 * Owner (superadmin) holds every ability regardless of what is stored here.
 */
#[Fillable(['slug', 'name', 'description', 'is_system', 'can_login', 'abilities'])]
class Role extends Model
{
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'role', 'slug');
    }

    public function isOwner(): bool
    {
        return $this->slug === UserRole::Superadmin->value;
    }

    /** Owner and the no-login built-ins (QC, Penjahit) can't be edited: their access is fixed by the app. */
    public function isLocked(): bool
    {
        return $this->isOwner() || ($this->is_system && ! $this->can_login);
    }

    public function isDeletable(): bool
    {
        return ! $this->is_system;
    }

    /**
     * Abilities in effect: everything for Owner, nothing for a role that can't log in, otherwise the stored list
     * minus values the app no longer knows.
     *
     * @return list<string>
     */
    public function effectiveAbilities(): array
    {
        if ($this->isOwner()) {
            return Ability::values();
        }

        if (! $this->can_login) {
            return [];
        }

        return Ability::normalize($this->abilities ?? []);
    }

    /** Stored values that no longer exist in the Ability catalog (left over after a feature was removed). */
    public function unknownAbilities(): array
    {
        return array_values(array_diff($this->abilities ?? [], Ability::values()));
    }

    /** @param  list<string>  $abilities */
    public function isCoveredBy(array $abilities): bool
    {
        return array_diff($this->effectiveAbilities(), $abilities) === [];
    }

    /** Roles a staff account can be given: can log in, and is not Owner (there is only one Owner account type). */
    public function scopeStaffAssignable(Builder $query): void
    {
        $query->where('can_login', true)->where('slug', '!=', UserRole::Superadmin->value);
    }

    public static function uniqueSlugFor(string $name): string
    {
        $base = Str::slug($name) ?: 'role';
        $slug = $base;
        $suffix = 2;

        while (static::query()->where('slug', $slug)->exists() || UserRole::tryFrom($slug) !== null) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'can_login' => 'boolean',
            'abilities' => 'array',
        ];
    }
}
