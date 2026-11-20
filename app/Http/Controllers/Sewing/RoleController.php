<?php

namespace App\Http\Controllers\Sewing;

use App\Enums\Ability;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\RoleRequest;
use App\Models\Role;
use App\Support\Access\AbilityAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Master data: roles and the abilities each one holds. Owner only (roles.manage). */
class RoleController extends Controller
{
    public function index(AbilityAudit $audit): Response
    {
        return Inertia::render('Master/Roles', [
            'roles' => Role::query()->withCount('users')->orderByDesc('is_system')->orderBy('id')->get()->map(fn (Role $role) => [
                'id' => $role->id,
                'slug' => $role->slug,
                'name' => $role->name,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'is_owner' => $role->isOwner(),
                'can_login' => $role->can_login,
                'is_locked' => $role->isLocked(),
                'is_deletable' => $role->isDeletable(),
                'users_count' => $role->users_count,
                'abilities' => $role->effectiveAbilities(),
                'unknown_abilities' => $role->unknownAbilities(),
            ]),
            'abilityGroups' => collect(Ability::cases())
                ->groupBy(fn (Ability $ability) => $ability->group())
                ->map(fn ($abilities, string $group) => [
                    'label' => $group,
                    'abilities' => $abilities->map(fn (Ability $ability) => [
                        'value' => $ability->value,
                        'label' => $ability->label(),
                        'description' => $ability->description(),
                        'requires' => $ability->requires()?->value,
                        'owner_only' => $ability->isOwnerOnly(),
                        'sensitive' => $ability->isSensitive(),
                    ])->values(),
                ])
                ->values(),
            'audit' => $audit->report(),
        ]);
    }

    public function store(RoleRequest $request): RedirectResponse
    {
        $role = Role::create([
            'slug' => Role::uniqueSlugFor($request->validated('name')),
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'is_system' => false,
            'can_login' => $request->boolean('can_login'),
            'abilities' => $request->abilities(),
        ]);

        return Redirect::back()->with('status', "Role {$role->name} dibuat dengan ".count($role->abilities).' ability.');
    }

    public function update(RoleRequest $request, Role $role): RedirectResponse
    {
        abort_if($role->isLocked(), 403, 'Role ini dikunci oleh sistem.');

        $role->fill([
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'abilities' => $request->abilities(),
        ]);

        if (! $role->is_system) {
            $role->can_login = $request->boolean('can_login');
        }

        $role->save();

        return Redirect::back()->with('status', "Role {$role->name} diperbarui.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        abort_unless($role->isDeletable(), 403, 'Role bawaan tidak bisa dihapus.');

        if ($role->users()->exists()) {
            throw ValidationException::withMessages(['role' => "Role {$role->name} masih dipakai {$role->users()->count()} akun. Pindahkan akunnya dulu."]);
        }

        $role->delete();

        return Redirect::back()->with('status', "Role {$role->name} dihapus.");
    }
}
