<?php

namespace App\Http\Requests\Sewing;

use App\Enums\Ability;
use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create or edit a role. Abilities come from the catalog; owner-only ones (roles.manage) can't be granted. */
class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Role|null $role */
        $role = $this->route('role');

        return [
            'name' => ['required', 'string', 'max:60', Rule::unique('roles', 'name')->ignore($role?->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'can_login' => [$role?->is_system ? 'prohibited' : 'required', 'boolean'],
            'abilities' => ['present', 'array'],
            'abilities.*' => ['string', Rule::in(array_map(fn (Ability $ability) => $ability->value, Ability::assignable()))],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'Nama role ini sudah dipakai.',
            'abilities.*.in' => 'Ada ability yang tidak dikenal atau khusus Owner.',
            'can_login.prohibited' => 'Akses login role bawaan tidak bisa diubah.',
        ];
    }

    /** @return list<string> */
    public function abilities(): array
    {
        return Ability::normalize($this->validated('abilities', []));
    }
}
