import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
    label: string;
    value: string | number;
    hint?: string;
    icon?: LucideIcon;
    className?: string;
    valueClassName?: string;
};

export function StatCard({ label, value, hint, icon: Icon, className, valueClassName }: StatCardProps) {
    return (
        <Card className={cn('gap-2 py-4', className)}>
            <CardHeader className="gap-2 px-4">
                <div className="flex items-center justify-between gap-3">
                    <CardDescription>{label}</CardDescription>
                    {Icon && (
                        <div className="rounded-md bg-muted p-2 text-foreground">
                            <Icon className="size-4" />
                        </div>
                    )}
                </div>
                <CardTitle className={cn('text-2xl tabular-nums', valueClassName)}>{value}</CardTitle>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </CardHeader>
        </Card>
    );
}
