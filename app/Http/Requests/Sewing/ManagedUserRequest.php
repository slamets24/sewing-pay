<?php

namespace App\Http\Requests\Sewing;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Create a staff account, or change its role. The role must be one the signed-in user may hand out
 * (see User::assignableRoles): never Owner, never a no-login role, and for non-owners never broader than their own.
 */
class ManagedUserRequest extends FormRequest
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
        $user = $this->route('user');
        $isCreate = $user === null;

        return [
            'name' => [$isCreate ? 'required' : 'prohibited', 'string', 'max:255'],
            'email' => [$isCreate ? 'required' : 'prohibited', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => [$isCreate ? 'required' : 'prohibited', 'confirmed', Password::defaults()],
            'role' => ['required', 'string', Rule::in($this->user()->assignableRoles()->map(fn (Role $role) => $role->slug)->all())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.in' => 'Peran ini tidak bisa Anda berikan. Owner tidak bisa dibuat lagi, dan peran tidak boleh punya akses melebihi akses Anda sendiri.',
        ];
    }
}
