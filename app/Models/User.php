<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Ability;
use App\Enums\UserRole;
use BackedEnum;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * `role` holds the slug of a row in `roles` (master data). The built-in slugs are the UserRole cases;
 * custom roles made by the Owner use their own slug.
 */
#[Fillable(['name', 'email', 'password', 'role', 'email_verified_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function tailor(): HasOne
    {
        return $this->hasOne(Tailor::class);
    }

    public function assignedRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role', 'slug');
    }

    public function hasRole(UserRole|string $role): bool
    {
        return $this->role === ($role instanceof UserRole ? $role->value : $role);
    }

    public function isSuperadmin(): bool
    {
        return $this->hasRole(UserRole::Superadmin);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin);
    }

    public function isQc(): bool
    {
        return $this->hasRole(UserRole::Qc);
    }

    public function isTailor(): bool
    {
        return $this->hasRole(UserRole::Tailor);
    }

    public function roleLabel(): string
    {
        return $this->assignedRole?->name ?? UserRole::tryFrom((string) $this->role)?->label() ?? (string) $this->role;
    }

    public function canLogin(): bool
    {
        return $this->isSuperadmin() || (bool) $this->assignedRole?->can_login;
    }

    /** @return list<string> */
    public function abilities(): array
    {
        if ($this->isSuperadmin()) {
            return Ability::values();
        }

        return $this->assignedRole?->effectiveAbilities() ?? [];
    }

    public function hasAbility(Ability|string $ability): bool
    {
        return in_array($ability instanceof Ability ? $ability->value : $ability, $this->abilities(), true);
    }

    /** First page this user may open, or null when the role has no menu at all. */
    public function homeRoute(): ?string
    {
        if (! $this->canLogin()) {
            return null;
        }

        foreach (Ability::homeRoutes() as $ability => $route) {
            if ($this->hasAbility($ability)) {
                return $route;
            }
        }

        return null;
    }

    /**
     * Whether this user may create, re-role, or reset the password of $target.
     * Owner manages everyone but themself; others only accounts whose role grants nothing they lack.
     */
    public function canManageAccount(User $target): bool
    {
        if ($this->is($target) || ! $this->hasAbility(Ability::UsersManage)) {
            return false;
        }

        if ($this->isSuperadmin()) {
            return true;
        }

        $targetRole = $target->assignedRole;

        return $targetRole !== null && ! $targetRole->isOwner() && $targetRole->can_login && $targetRole->isCoveredBy($this->abilities());
    }

    /** Roles this user may hand out: login roles other than Owner, and (for non-owners) no broader than their own. */
    public function assignableRoles()
    {
        return Role::query()
            ->staffAssignable()
            ->orderBy('id')
            ->get()
            ->filter(fn (Role $role) => $this->isSuperadmin() || $role->isCoveredBy($this->abilities()))
            ->values();
    }

    /** Accepts a UserRole case or a slug string; stored as the slug. */
    protected function role(): Attribute
    {
        return Attribute::make(
            set: function (mixed $value): ?string {
                $this->unsetRelation('assignedRole');

                return $value instanceof BackedEnum ? (string) $value->value : $value;
            },
        );
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
