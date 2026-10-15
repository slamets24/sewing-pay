<?php

namespace App\Actions\Sewing;

use App\Enums\RevisionStatus;
use App\Models\Revision;
use App\Models\Tailor;
use App\Services\Sewing\RevisionStockHold;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Moves a revision one step: menunggu bahan → bahan datang → dikerjakan → selesai.
 * The fixing tailor can still be swapped before the work starts.
 */
class AdvanceRevisionAction
{
    public function __construct(private readonly RevisionStockHold $hold) {}

    public function execute(Revision $revision, ?int $tailorId = null): Revision
    {
        return DB::transaction(function () use ($revision, $tailorId) {
            $revision = Revision::query()->with('part')->lockForUpdate()->findOrFail($revision->id);
            $next = $revision->nextStatus();

            if ($next === null) {
                throw ValidationException::withMessages(['revision' => 'Revisi ini sudah selesai.']);
            }

            if ($tailorId && $tailorId !== $revision->tailor_id) {
                $this->reassign($revision, Tailor::query()->findOrFail($tailorId));
            }

            $revision->status = $next;
            $timestamp = match ($next) {
                RevisionStatus::MaterialReady => 'material_ready_at',
                RevisionStatus::InProgress => 'started_at',
                RevisionStatus::Done => 'completed_at',
                default => null,
            };

            if ($timestamp) {
                $revision->{$timestamp} = now();
            }

            $revision->save();

            if ($next === RevisionStatus::MaterialReady) {
                $this->hold->release($revision);
            }

            return $revision;
        });
    }

    private function reassign(Revision $revision, Tailor $tailor): void
    {
        if ($revision->status === RevisionStatus::InProgress || $revision->isDone()) {
            throw ValidationException::withMessages(['tailor_id' => 'Penjahit tidak bisa diganti setelah revisi mulai dikerjakan.']);
        }

        $rate = $revision->type->isPaid() && $tailor->isPaidHere() ? (int) ($revision->part?->price ?? $revision->rate) : 0;

        $revision->tailor_id = $tailor->id;
        $revision->rate = $rate;
        $revision->subtotal = $rate * $revision->qty;
    }
}
