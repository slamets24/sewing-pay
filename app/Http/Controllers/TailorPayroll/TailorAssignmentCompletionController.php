<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\RecordTailorCompletionAction;
use App\Actions\UndoTailorCompletionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreTailorAssignmentCompletionRequest;
use App\Models\TailorAssignment;
use App\Models\TailorAssignmentCompletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;

class TailorAssignmentCompletionController extends Controller
{
    public function store(
        StoreTailorAssignmentCompletionRequest $request,
        TailorAssignment $assignment,
        RecordTailorCompletionAction $recordCompletion
    ): RedirectResponse {
        $completion = $recordCompletion->execute($assignment, [
            ...$request->validated(),
            'created_by' => $request->user()?->id,
        ]);

        return Redirect::back(fallback: route('dashboard'))
            ->with('status', "{$completion->completed_qty} pcs {$completion->tailor->name} dicatat selesai.")
            ->with('undo', [
                'url' => route('completions.destroy', $completion),
                'method' => 'delete',
            ]);
    }

    public function destroy(
        Request $request,
        TailorAssignmentCompletion $completion,
        UndoTailorCompletionAction $undoCompletion
    ): RedirectResponse {
        Gate::authorize('delete', $completion);

        $undoCompletion->execute($completion);

        return Redirect::back(fallback: route($request->user()->role->homeRoute()))
            ->with('status', 'Input selesai dibatalkan.');
    }
}
