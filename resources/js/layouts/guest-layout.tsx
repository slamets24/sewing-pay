import { AppLogo } from '@/components/app-logo';
import { DisplaySettings } from '@/components/sewing/display-settings';
import type { ReactNode } from 'react';

type GuestLayoutProps = {
    title: string;
    description?: string;
    children: ReactNode;
};

export default function GuestLayout({ title, description, children }: GuestLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <div className="flex justify-end px-4 pt-4">
                <DisplaySettings />
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-12">
                <AppLogo subtitle="Divisi jahit" />
                <div className="surface-card w-full max-w-md overflow-hidden">
                    <div className="flex flex-col gap-1 px-6 py-6">
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                    </div>
                    <div className="border-t border-border/60 px-6 py-6">{children}</div>
                </div>
            </div>
        </div>
    );
}
