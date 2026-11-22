import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import type { ReactNode } from 'react';

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <Empty className={cn('flex-none gap-3 border p-6 text-sm text-muted-foreground md:p-6', className)}>
            {children}
        </Empty>
    );
}
