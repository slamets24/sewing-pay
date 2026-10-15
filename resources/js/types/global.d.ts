import type { route as ziggyRoute } from 'ziggy-js';
import type { SharedData } from './index';

declare global {
    /* eslint-disable no-var */
    var route: typeof ziggyRoute;
}

declare module '@inertiajs/core' {
    interface PageProps extends SharedData {}
}
