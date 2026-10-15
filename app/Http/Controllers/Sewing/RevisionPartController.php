<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\RevisionPartRequest;
use App\Models\RevisionPart;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class RevisionPartController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Master/RevisionParts', [
            'parts' => RevisionPart::query()->orderByDesc('is_active')->orderBy('name')->get(['id', 'name', 'price', 'material_type', 'is_active']),
        ]);
    }

    public function store(RevisionPartRequest $request): RedirectResponse
    {
        $part = RevisionPart::create([...$request->validated(), 'is_active' => true]);

        return Redirect::back()->with('status', "Bagian {$part->name} ditambahkan.");
    }

    public function update(RevisionPartRequest $request, RevisionPart $revisionPart): RedirectResponse
    {
        $revisionPart->update($request->validated());

        return Redirect::back()->with('status', "Bagian {$revisionPart->name} diperbarui.");
    }
}
