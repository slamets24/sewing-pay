import type { Tone } from '@/lib/tone';
import type { UserRole } from '@/types';
import type { ManagedUserRecord } from '@/types/sewing';

export type NewUserFormData = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: UserRole;
};

export type RoleFormData = {
    role: UserRole;
};

export type PasswordFormData = {
    password: string;
    password_confirmation: string;
};

export type RoleOption = { value: UserRole; label: string; description: string };

/** A role the signed-in user may hand out, as sent by ManagedUserController (master data, so it can be custom). */
export type AssignableRole = { value: string; label: string; description: string | null };

const BUILT_IN_TONE: Record<string, Tone> = {
    superadmin: 'primary',
    admin: 'ready',
    qc: 'neutral',
    penjahit: 'sewing',
};

/** Roles offered in the account forms; names and descriptions come from Master Data › Role & Akses. */
export class RoleCatalog {
    constructor(private readonly roles: AssignableRole[]) {}

    options(): RoleOption[] {
        return this.roles.map((role) => ({
            value: role.value,
            label: role.label,
            description: role.description ?? '',
        }));
    }

    /** Built-in roles keep their colour; custom roles share one. */
    static tone(role: UserRole): Tone {
        return BUILT_IN_TONE[role] ?? 'other';
    }
}

/** Shapes the account forms to what ManagedUserRequest / ResetPasswordRequest expect. */
export class ManagedUserForm {
    static blank(defaultRole: UserRole = 'admin'): NewUserFormData {
        return { name: '', email: '', password: '', password_confirmation: '', role: defaultRole };
    }

    static createPayload(data: NewUserFormData) {
        return {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password,
            password_confirmation: data.password_confirmation,
            role: data.role,
        };
    }

    static roleForm(user: ManagedUserRecord): RoleFormData {
        return { role: user.role };
    }

    static rolePayload(data: RoleFormData) {
        return { role: data.role };
    }

    static blankPassword(): PasswordFormData {
        return { password: '', password_confirmation: '' };
    }
}
