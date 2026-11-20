import type { Ability } from '@/lib/abilities';

/** One row of Master Data › Role & Akses, as sent by RoleController@index. */
export type RoleRecord = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    is_system: boolean;
    is_owner: boolean;
    can_login: boolean;
    /** Owner and the no-login built-ins (QC, Penjahit): access fixed by the app. */
    is_locked: boolean;
    is_deletable: boolean;
    users_count: number;
    abilities: Ability[];
    /** Values stored on the role that the app no longer knows. Dropped on the next save. */
    unknown_abilities: string[];
};

export type AbilityInfo = {
    value: Ability;
    label: string;
    description: string;
    /** Page this action lives on; checked automatically together with it. */
    requires: Ability | null;
    owner_only: boolean;
    sensitive: boolean;
};

export type AbilityGroup = { label: string; abilities: AbilityInfo[] };

type RouteRow = { name: string; uri: string; methods: string; ability?: string };

export type AbilityAuditReport = {
    unguarded_routes: RouteRow[];
    undefined_abilities: RouteRow[];
    unused_abilities: string[];
    stale_role_abilities: { role: string; abilities: string[] }[];
    route_count: number;
    ability_count: number;
};

export type RoleFormData = {
    name: string;
    description: string;
    can_login: boolean;
    abilities: Ability[];
};

/** Ability picking with dependencies: an action pulls in its page, and dropping a page drops its actions. */
export class AbilitySelection {
    private readonly byValue: Map<Ability, AbilityInfo>;

    constructor(private readonly groups: AbilityGroup[]) {
        this.byValue = new Map(groups.flatMap((group) => group.abilities.map((ability) => [ability.value, ability] as const)));
    }

    assignable(): AbilityInfo[] {
        return this.groups.flatMap((group) => group.abilities).filter((ability) => !ability.owner_only);
    }

    toggle(selected: readonly Ability[], ability: Ability, on: boolean): Ability[] {
        const next = new Set(selected);

        if (on) {
            next.add(ability);
            const required = this.byValue.get(ability)?.requires;
            if (required) next.add(required);
        } else {
            next.delete(ability);
            this.dependentsOf(ability).forEach((dependent) => next.delete(dependent));
        }

        return this.ordered(next);
    }

    setGroup(selected: readonly Ability[], group: AbilityGroup, on: boolean): Ability[] {
        return group.abilities.filter((ability) => !ability.owner_only).reduce((current, ability) => this.toggle(current, ability.value, on), [...selected]);
    }

    groupState(selected: readonly Ability[], group: AbilityGroup): boolean | 'indeterminate' {
        const assignable = group.abilities.filter((ability) => !ability.owner_only);
        const picked = assignable.filter((ability) => selected.includes(ability.value)).length;

        if (picked === 0) return false;
        return picked === assignable.length ? true : 'indeterminate';
    }

    requiredBy(ability: Ability, selected: readonly Ability[]): AbilityInfo[] {
        return this.dependentsOf(ability)
            .filter((dependent) => selected.includes(dependent))
            .map((dependent) => this.byValue.get(dependent)!)
            .filter(Boolean);
    }

    label(ability: Ability): string {
        return this.byValue.get(ability)?.label ?? ability;
    }

    private dependentsOf(ability: Ability): Ability[] {
        return [...this.byValue.values()].filter((info) => info.requires === ability).map((info) => info.value);
    }

    /** Catalog order, so the saved list reads the same as the screen. */
    private ordered(values: Set<Ability>): Ability[] {
        return [...this.byValue.keys()].filter((value) => values.has(value));
    }
}

export class RoleForm {
    static blank(): RoleFormData {
        return { name: '', description: '', can_login: true, abilities: [] };
    }

    static fromRecord(role: RoleRecord): RoleFormData {
        return { name: role.name, description: role.description ?? '', can_login: role.can_login, abilities: [...role.abilities] };
    }

    static payload(data: RoleFormData, role: RoleRecord | null) {
        const base = { name: data.name.trim(), description: data.description.trim() || null, abilities: data.abilities };

        // Built-in roles keep their login access; the server refuses a change.
        return role?.is_system ? base : { ...base, can_login: data.can_login };
    }

    static auditIssueCount(report: AbilityAuditReport): number {
        return report.unguarded_routes.length + report.undefined_abilities.length + report.unused_abilities.length + report.stale_role_abilities.length;
    }
}
