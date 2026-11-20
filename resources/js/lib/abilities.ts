import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';

/** Mirror of app/Enums/Ability.php. Add the value here too when a new ability is added there. */
export type Ability =
    | 'dashboard.view'
    | 'desk.use'
    | 'pickups.manage'
    | 'deliveries.manage'
    | 'work-orders.view'
    | 'work-orders.manage'
    | 'work-orders.purge'
    | 'cutting.manage'
    | 'hancaan.manage'
    | 'production-reports.view'
    | 'qc-shipments.manage'
    | 'revisions.manage'
    | 'attendances.manage'
    | 'tailors.manage'
    | 'tailors.sync-hr'
    | 'payouts.view'
    | 'payouts.manage'
    | 'payouts.pay'
    | 'payouts.force-delete'
    | 'makloon-payments.manage'
    | 'articles.view'
    | 'articles.create'
    | 'articles.update'
    | 'articles.samples'
    | 'articles.sync'
    | 'revision-parts.manage'
    | 'users.manage'
    | 'roles.manage';

/** `can('articles.update')` — true when the signed-in user's role holds the ability. */
export function useCan(): (ability: Ability) => boolean {
    const abilities = usePage<SharedData>().props.auth.user?.abilities ?? [];

    return useCallback((ability: Ability) => abilities.includes(ability), [abilities]);
}
