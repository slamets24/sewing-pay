<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\RecordTailorCompletionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreTailorAssignmentCompletionRequest;
use App\Models\TailorAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class TailorAssignmentCompletionController extends Controller
{
    public function store(
        StoreTailorAssignmentCompletionRequest $request,
        TailorAssignment $assignment,
        RecordTailorCompletionAction $recordCompletion
    ): RedirectResponse {
        $recordCompletion->execute($assignment, [
            ...$request->validated(),
            'created_by' => $request->user()?->id,
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Qty selesai dicatat.');
    }
}
