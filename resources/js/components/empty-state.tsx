import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground', className)}>
            {children}
        </div>
    );
}
