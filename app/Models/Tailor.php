<?php

namespace App\Models;

use App\Enums\TailorType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Tailor extends Model
{
    use HasFactory;

    public const DEFAULT_PORTAL_PIN = '123456';

    protected $hidden = [
        'portal_pin',
    ];

    protected $fillable = [
        'code',
        'name',
        'type',
        'user_id',
        'whatsapp_number',
        'address',
        'is_active',
        'joined_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => TailorType::class,
            'is_active' => 'boolean',
            'joined_at' => 'date',
            'portal_pin' => 'hashed',
            'portal_pin_changed_at' => 'datetime',
        ];
    }

    /** Create the private link and the starting PIN. The tailor must replace that PIN on first open. */
    public function generatePortal(): void
    {
        $this->forceFill([
            'portal_token' => Str::random(48),
            'portal_pin' => self::DEFAULT_PORTAL_PIN,
            'portal_pin_changed_at' => null,
        ])->save();
    }

    /** Replace the link. The PIN stays, and the old link stops working. */
    public function regeneratePortalToken(): void
    {
        $this->forceFill(['portal_token' => Str::random(48)])->save();
    }

    public function resetPortalPin(): void
    {
        $this->forceFill([
            'portal_pin' => self::DEFAULT_PORTAL_PIN,
            'portal_pin_changed_at' => null,
        ])->save();
    }

    public function changePortalPin(string $pin): void
    {
        $this->forceFill([
            'portal_pin' => $pin,
            'portal_pin_changed_at' => now(),
        ])->save();
    }

    public function mustChangePortalPin(): bool
    {
        return $this->portal_pin_changed_at === null;
    }

    public function unlockPortal(): void
    {
        session()->put($this->portalSessionKey(), $this->portal_token);
    }

    public function lockPortal(): void
    {
        session()->forget($this->portalSessionKey());
    }

    public function portalIsUnlocked(): bool
    {
        return session($this->portalSessionKey()) === $this->portal_token;
    }

    private function portalSessionKey(): string
    {
        return 'portal.unlocked.'.$this->id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function pickupItems(): HasMany
    {
        return $this->hasMany(PickupItem::class);
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(SewingDelivery::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(Revision::class);
    }

    public function payoutSlips(): HasMany
    {
        return $this->hasMany(PayoutSlip::class);
    }

    public function isPaidHere(): bool
    {
        return $this->type->isPaidHere();
    }
}
