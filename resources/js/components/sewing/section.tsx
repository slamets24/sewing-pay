import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <Card asChild>
            <section className={cn('overflow-hidden', className)}>
                <CardHeader className="flex flex-row flex-wrap items-center gap-3 px-5 py-4">
                    {Icon && (
                        <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <Icon className="size-5" strokeWidth={1.75} />
                        </span>
                    )}
                    <div className="min-w-0 flex-1 basis-48">
                        <CardTitle className="text-base leading-6"><h2 className="font-semibold">{title}</h2></CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </CardHeader>
                <CardContent className="border-t px-5 py-4">{children}</CardContent>
            </section>
        </Card>
    );
}

/** Short explanation under the page title, with the page's main buttons on the right. */
export function PageIntro({ children, actions, hideTextOnPhone = false }: { children?: ReactNode; actions?: ReactNode; hideTextOnPhone?: boolean }) {
    if (!children && !actions) return null;
    return (
        <div className="mb-5 flex flex-wrap items-center gap-3">
            {children && <p className={cn('min-w-64 flex-1 text-sm text-muted-foreground sm:text-base', hideTextOnPhone && 'hidden sm:block')}>{children}</p>}
            {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
        </div>
    );
}
