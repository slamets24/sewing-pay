<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\ResetManagedUserPasswordRequest;
use App\Http\Requests\TailorPayroll\StoreManagedUserRequest;
use App\Http\Requests\TailorPayroll\UpdateManagedUserRoleRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class ManagedUserController extends Controller
{
    public function store(StoreManagedUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Akun pengguna dibuat.');
    }

    public function updateRole(UpdateManagedUserRoleRequest $request, User $user): RedirectResponse
    {
        if ($request->user()?->is($user)) {
            throw ValidationException::withMessages([
                'role' => 'Role akun sendiri tidak bisa diubah dari halaman ini.',
            ]);
        }

        $user->update([
            'role' => $request->validated('role'),
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Role akun diperbarui.');
    }

    public function resetPassword(ResetManagedUserPasswordRequest $request, User $user): RedirectResponse
    {
        $user->update([
            'password' => Hash::make($request->validated('password')),
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Password akun direset.');
    }
}
