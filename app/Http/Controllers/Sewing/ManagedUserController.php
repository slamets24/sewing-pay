<?php

namespace App\Http\Controllers\Sewing;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\ManagedUserRequest;
use App\Http\Requests\Sewing\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ManagedUserController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Master/Users', [
            'users' => User::query()->orderBy('name')->get()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
                'is_current_user' => $user->is($request->user()),
            ]),
            'roles' => collect(UserRole::cases())
                ->filter(fn (UserRole $role) => $role->isStaff())
                ->map(fn (UserRole $role) => ['value' => $role->value, 'label' => $role->label()])
                ->values(),
        ]);
    }

    public function store(ManagedUserRequest $request): RedirectResponse
    {
        $data = $request->validated();

        User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
        ]);

        return Redirect::back()->with('status', 'Akun dibuat.');
    }

    public function update(ManagedUserRequest $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['role' => 'Peran akun sendiri tidak bisa diubah dari sini.']);
        }

        $user->update(['role' => $request->validated('role')]);

        return Redirect::back()->with('status', 'Peran akun diperbarui.');
    }

    public function resetPassword(ResetPasswordRequest $request, User $user): RedirectResponse
    {
        $user->update(['password' => Hash::make($request->validated('password'))]);

        return Redirect::back()->with('status', 'Password direset.');
    }
}
