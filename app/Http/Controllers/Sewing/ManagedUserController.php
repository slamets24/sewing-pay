<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\ManagedUserRequest;
use App\Http\Requests\Sewing\ResetPasswordRequest;
use App\Models\Role;
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
        $actor = $request->user();

        return Inertia::render('Master/Users', [
            'users' => User::query()->with('assignedRole')->orderBy('name')->get()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'role_label' => $user->roleLabel(),
                'is_current_user' => $user->is($actor),
                'can_manage' => $actor->canManageAccount($user),
                // Owner may reset a no-login account (e.g. Penjahit) but not move it into a staff role.
                'can_change_role' => $actor->canManageAccount($user) && (bool) $user->assignedRole?->can_login && ! $user->isSuperadmin(),
            ]),
            'roles' => $actor->assignableRoles()->map(fn (Role $role) => [
                'value' => $role->slug,
                'label' => $role->name,
                'description' => $role->description,
            ]),
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

        abort_unless($request->user()->canManageAccount($user) && ! $user->isSuperadmin() && $user->assignedRole?->can_login, 403);

        $user->update(['role' => $request->validated('role')]);

        return Redirect::back()->with('status', 'Peran akun diperbarui.');
    }

    public function resetPassword(ResetPasswordRequest $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->canManageAccount($user), 403);
        $user->update(['password' => Hash::make($request->validated('password'))]);

        return Redirect::back()->with('status', 'Password direset.');
    }
}
