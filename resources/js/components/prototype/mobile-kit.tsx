import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Home, LayoutGrid, Scissors, Search, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tab = 'home' | 'loket' | 'produksi' | 'menu';

/** Judul layar dengan tombol kembali (target sentuh 44 px). */
export function ScreenHeader({ title, subtitle, onBack, action }: { title: string; subtitle?: string; onBack?: () => void; action?: ReactNode }) {
    return (
        <header className="flex items-start gap-1 px-4 pt-4 pb-3">
            {onBack && (
                <button type="button" onClick={onBack} aria-label="Kembali" className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-muted">
                    <ChevronLeft className="size-6" />
                </button>
            )}
            <div className="min-w-0 flex-1 pt-1.5">
                <h1 className="font-display text-xl leading-tight font-bold">{title}</h1>
                {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {action}
        </header>
    );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('rounded-2xl border border-border/70 bg-card shadow-2xs', className)}>{children}</div>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
    return (
        <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 rounded-xl bg-card pl-10" />
        </label>
    );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
    return (
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1" role="group">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'h-9 flex-1 rounded-lg text-xs font-semibold transition-colors',
                        value === option.value ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

/** Baris yang bisa diketuk, dengan ikon kiri dan panah kanan. */
export function RowButton({ icon: Icon, title, hint, onClick, tone }: { icon?: LucideIcon; title: ReactNode; hint?: ReactNode; onClick: () => void; tone?: 'warn' }) {
    return (
        <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
            {Icon && <Icon className={cn('size-5 shrink-0', tone === 'warn' ? 'text-stage-sewing' : 'text-primary')} />}
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{title}</span>
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
    );
}

export function Note({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
    return (
        <div className="flex gap-2.5 rounded-xl bg-primary/8 px-3.5 py-3 text-xs leading-relaxed text-foreground/80">
            {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-primary" />}
            <p>{children}</p>
        </div>
    );
}

export function Initial({ name }: { name: string }) {
    return (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden>
            {name.charAt(0)}
        </span>
    );
}

/** Ringkasan total + tombol utama, menempel di bawah layar alur. */
export function ActionBar({ label, value, children }: { label?: string; value?: ReactNode; children: ReactNode }) {
    return (
        <div className="sticky bottom-0 z-10 mt-auto border-t border-border/70 bg-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
            {label && (
                <div className="mb-2.5 flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-display text-2xl font-bold tabular">{value}</span>
                </div>
            )}
            <div className="flex flex-col gap-2">{children}</div>
        </div>
    );
}

export function SuccessScreen({ title, subtitle, children, actions }: { title: string; subtitle: string; children: ReactNode; actions: ReactNode }) {
    return (
        <div className="flex flex-1 flex-col px-5 pt-16 pb-8">
            <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-stage-done/12 text-stage-done">
                <Check className="size-9" strokeWidth={2.5} />
            </span>
            <h1 className="mt-6 text-center font-display text-2xl font-bold">{title}</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <div className="mt-8 flex flex-col gap-2.5">{actions}</div>
        </div>
    );
}

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
    { value: 'home', label: 'Beranda', icon: Home },
    { value: 'loket', label: 'Loket', icon: Scissors },
    { value: 'produksi', label: 'Produksi', icon: ClipboardList },
    { value: 'menu', label: 'Menu', icon: LayoutGrid },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
    return (
        <nav className="sticky bottom-0 z-10 mt-auto grid grid-cols-4 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Menu utama">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.value === active;

                return (
                    <button
                        key={tab.value}
                        type="button"
                        onClick={() => onChange(tab.value)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}
                    >
                        <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-primary/12')}>
                            <Icon className="size-5" />
                        </span>
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}

export function SampleFootnote({ children = 'Pratinjau · data contoh, tidak tersimpan' }: { children?: ReactNode }) {
    return <p className="py-4 text-center text-[11px] text-muted-foreground">{children}</p>;
}
