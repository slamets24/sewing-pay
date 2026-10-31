import type { Tone } from '@/lib/tone';
import type { SelectOption, UserRole } from '@/types';
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

const ROLE_INFO: Record<UserRole, { description: string; tone: Tone }> = {
    superadmin: { description: 'Akses penuh sistem', tone: 'primary' },
    admin: { description: 'Operasional harian jahit', tone: 'ready' },
    qc: { description: 'Non-aktif', tone: 'neutral' },
    penjahit: { description: 'Portal penjahit', tone: 'sewing' },
};

/** The four roles with plain-language descriptions; labels come from the server so they stay in sync. */
export class RoleCatalog {
    constructor(private readonly roles: SelectOption[]) {}

    options(): RoleOption[] {
        return this.roles.filter((role) => RoleCatalog.isRole(role.value)).map((role) => ({
            value: role.value as UserRole,
            label: role.label,
            description: ROLE_INFO[role.value as UserRole].description,
        }));
    }

    static tone(role: UserRole): Tone {
        return ROLE_INFO[role].tone;
    }

    private static isRole(value: string): value is UserRole {
        return value in ROLE_INFO;
    }
}

/** Shapes the account forms to what ManagedUserRequest / ResetPasswordRequest expect. */
export class ManagedUserForm {
    static blank(): NewUserFormData {
        return { name: '', email: '', password: '', password_confirmation: '', role: 'admin' };
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
