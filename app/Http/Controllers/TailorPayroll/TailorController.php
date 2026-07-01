<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreTailorRequest;
use App\Http\Requests\TailorPayroll\UpdateTailorRequest;
use App\Models\Tailor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class TailorController extends Controller
{
    public function store(StoreTailorRequest $request): RedirectResponse
    {
        Tailor::create($request->validated());

        return Redirect::route('dashboard')->with('status', 'Penjahit ditambahkan.');
    }

    public function update(UpdateTailorRequest $request, Tailor $tailor): RedirectResponse
    {
        $tailor->update($request->validated());

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Data penjahit diperbarui.');
    }

    public function deactivate(Tailor $tailor): RedirectResponse
    {
        $tailor->update(['is_active' => false]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Penjahit dinonaktifkan.');
    }

    public function activate(Tailor $tailor): RedirectResponse
    {
        $tailor->update(['is_active' => true]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Penjahit diaktifkan.');
    }
}
