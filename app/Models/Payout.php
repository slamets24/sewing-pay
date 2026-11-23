<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A pay run on a free date: everything unpaid up to the cut-off date.
 * Kalau koneksi hr-azzahra diatur, draft harus di-acc HR dulu (hr_status) sebelum slip boleh dibayar.
 */
class Payout extends Model
{
    public const HR_SUBMITTED = 'submitted';

    public const HR_APPROVED = 'approved';

    public const HR_RETURNED = 'returned';

    protected $fillable = [
        'code',
        'cutoff_date',
        'status',
        'hr_status',
        'hr_submitted_at',
        'hr_decided_at',
        'hr_decided_by',
        'hr_note',
        'total_tailors',
        'total_qty',
        'total_amount',
        'generated_at',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'cutoff_date' => 'date',
            'status' => PayoutStatus::class,
            'total_tailors' => 'integer',
            'total_qty' => 'integer',
            'total_amount' => 'integer',
            'generated_at' => 'datetime',
            'paid_at' => 'datetime',
            'hr_submitted_at' => 'datetime',
            'hr_decided_at' => 'datetime',
        ];
    }

    public function slips(): HasMany
    {
        return $this->hasMany(PayoutSlip::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isDraft(): bool
    {
        return $this->status === PayoutStatus::Draft;
    }

    /** Persetujuan HR wajib kalau OPSEW tersambung ke hr-azzahra. */
    public static function requiresHrApproval(): bool
    {
        return filled(config('services.hr_azzahra.url')) && filled(config('services.hr_azzahra.key'));
    }

    /** Sedang di HR atau sudah di-acc: angka slip tidak boleh diubah dari OPSEW. */
    public function isLockedByHr(): bool
    {
        return in_array($this->hr_status, [self::HR_SUBMITTED, self::HR_APPROVED], true);
    }

    /** Slip boleh ditandai dibayar: HR sudah acc, atau OPSEW tidak memakai persetujuan HR. */
    public function canBePaid(): bool
    {
        return ! self::requiresHrApproval() || $this->hr_status === self::HR_APPROVED;
    }

    public function hrStatusLabel(): string
    {
        return match ($this->hr_status) {
            self::HR_SUBMITTED => 'Menunggu acc HR',
            self::HR_APPROVED => 'Disetujui HR',
            self::HR_RETURNED => 'Dikembalikan HR',
            default => self::requiresHrApproval() ? 'Belum dikirim ke HR' : '',
        };
    }
}
