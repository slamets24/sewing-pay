import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

type SearchBoxProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
};

/** Text filter with a magnifier and a visible "Hapus" button once something is typed. */
export function SearchBox({ value, onChange, placeholder, label, className }: SearchBoxProps) {
    return (
        <div className={cn('relative w-full', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className={cn('pl-10', value && 'pr-24')}
            />
            {value && (
                <Button type="button" variant="ghost" size="sm" className="absolute top-1/2 right-1 -translate-y-1/2" onClick={() => onChange('')}>
                    <X />
                    Hapus
                </Button>
            )}
        </div>
    );
}
