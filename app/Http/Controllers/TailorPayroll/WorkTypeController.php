<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreWorkTypeRequest;
use App\Http\Requests\TailorPayroll\UpdateWorkTypeRequest;
use App\Models\WorkType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class WorkTypeController extends Controller
{
    public function store(StoreWorkTypeRequest $request): RedirectResponse
    {
        WorkType::create([
            ...$request->validated(),
            'is_active' => true,
            'source' => 'manual',
        ]);

        return Redirect::route('dashboard')->with('status', 'Tarif kerja ditambahkan.');
    }

    public function update(UpdateWorkTypeRequest $request, WorkType $workType): RedirectResponse
    {
        $workType->update($request->validated());

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Tarif kerja diperbarui.');
    }

    public function deactivate(WorkType $workType): RedirectResponse
    {
        $workType->update(['is_active' => false]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Tarif kerja dinonaktifkan.');
    }

    public function activate(WorkType $workType): RedirectResponse
    {
        $workType->update(['is_active' => true]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Tarif kerja diaktifkan.');
    }
}
