<?php

namespace App\Actions\Sewing;

use App\Models\Revision;
use App\Services\Sewing\RevisionStockHold;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Removes a mistaken revision; pieces it was holding in the warehouse become takeable again. */
class DeleteRevisionAction
{
    public function __construct(private readonly RevisionStockHold $hold) {}

    public function execute(Revision $revision): void
    {
        DB::transaction(function () use ($revision) {
            $revision = Revision::query()->lockForUpdate()->findOrFail($revision->id);

            if ($revision->slipLine()->exists()) {
                throw ValidationException::withMessages(['revision' => 'Revisi ini sudah masuk slip gaji.']);
            }

            $this->hold->release($revision);
            $revision->delete();
        });
    }
}
