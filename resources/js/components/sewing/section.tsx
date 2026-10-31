import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type SectionProps = {
    title: string;
    description?: ReactNode;
    icon?: LucideIcon;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

/** White floating panel — basic building block of every page. */
export function Section({ title, description, icon: Icon, actions, children, className }: SectionProps) {
    return (
        <section className={cn('surface-card overflow-hidden', className)}>
            <header className="flex flex-wrap items-center gap-3 px-5 py-4">
                {Icon && (
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                )}
                <div className="min-w-0 flex-1 basis-48">
                    <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </header>
            <div className="border-t border-border/60 px-5 py-4">{children}</div>
        </section>
    );
}

/** Short explanation under the page title, with the page's main buttons on the right. */
export function PageIntro({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
    if (!children && !actions) return null;
    return (
        <div className="mb-5 flex flex-wrap items-center gap-3">
            {children && <p className="min-w-64 flex-1 text-base text-muted-foreground">{children}</p>}
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
