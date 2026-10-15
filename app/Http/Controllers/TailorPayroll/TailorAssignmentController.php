<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\CancelTailorAssignmentAction;
use App\Actions\CreateTailorAssignmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreTailorAssignmentRequest;
use App\Models\TailorAssignment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Redirect;

class TailorAssignmentController extends Controller
{
    public function store(StoreTailorAssignmentRequest $request, CreateTailorAssignmentAction $createAssignment): RedirectResponse
    {
        $assignment = $createAssignment->execute([
            ...$request->validated(),
            'created_by' => $request->user()?->id,
        ]);

        return Redirect::back(fallback: route('dashboard'))
            ->with('status', "{$assignment->tailor->name} ambil {$assignment->assigned_qty} pcs {$assignment->productionArticle->article_name}.")
            ->with('undo', [
                'url' => route('assignments.cancel', $assignment),
                'method' => 'post',
            ]);
    }

    public function cancel(Request $request, TailorAssignment $assignment, CancelTailorAssignmentAction $cancelAssignment): RedirectResponse
    {
        Gate::authorize('cancel', $assignment);

        $cancelAssignment->execute($assignment, $request->user()->id);

        return Redirect::back(fallback: route($request->user()->role->homeRoute()))
            ->with('status', 'Pengambilan dibatalkan, qty kembali ke stok hancaan.');
    }
}
