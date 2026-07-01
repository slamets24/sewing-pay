<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\CreateTailorAssignmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreTailorAssignmentRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class TailorAssignmentController extends Controller
{
    public function store(StoreTailorAssignmentRequest $request, CreateTailorAssignmentAction $createAssignment): RedirectResponse
    {
        $createAssignment->execute([
            ...$request->validated(),
            'created_by' => $request->user()?->id,
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Hancaan diambil penjahit.');
    }
}
