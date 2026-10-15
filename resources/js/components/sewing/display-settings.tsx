import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DisplayPreferences } from '@/lib/display-preferences';
import { cn } from '@/lib/utils';
import { Check, Contrast, Type } from 'lucide-react';
import { useEffect, useState } from 'react';

/** "Aa" button that opens big, simple choices for text size and contrast. */
export function DisplaySettings({ className }: { className?: string }) {
    const [preferences, setPreferences] = useState(() => DisplayPreferences.load());

    useEffect(() => preferences.apply(), [preferences]);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className={cn('gap-1.5 font-bold', className)} aria-label="Atur ukuran huruf dan kontras">
                    <Type />
                    Aa
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-sm">
                <SheetHeader>
                    <SheetTitle className="text-2xl">Tampilan</SheetTitle>
                    <SheetDescription className="text-base">Pilihan ini hanya untuk perangkat ini.</SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-4">
                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 flex items-center gap-2 text-lg font-semibold">
                            <Type className="size-5" />
                            Ukuran huruf
                        </legend>
                        {DisplayPreferences.scales.map((scale, index) => (
                            <Button
                                key={scale.value}
                                variant={preferences.textScale === scale.value ? 'default' : 'outline'}
                                className="h-14 justify-between"
                                onClick={() => setPreferences(preferences.withTextScale(scale.value))}
                            >
                                <span style={{ fontSize: `${1 + index * 0.2}rem` }}>{scale.label}</span>
                                {preferences.textScale === scale.value && <Check />}
                            </Button>
                        ))}
                    </fieldset>

                    <fieldset className="flex flex-col gap-2">
                        <legend className="mb-2 flex items-center gap-2 text-lg font-semibold">
                            <Contrast className="size-5" />
                            Kontras warna
                        </legend>
                        <Button
                            variant={preferences.highContrast ? 'default' : 'outline'}
                            className="h-14 justify-between"
                            onClick={() => setPreferences(preferences.withHighContrast(!preferences.highContrast))}
                        >
                            {preferences.highContrast ? 'Kontras tinggi: aktif' : 'Kontras tinggi: mati'}
                            {preferences.highContrast && <Check />}
                        </Button>
                        <p className="text-sm text-muted-foreground">Tulisan jadi hitam pekat dan garis lebih tebal. Cocok untuk mata minus atau ruangan terang.</p>
                    </fieldset>
                </div>
            </SheetContent>
        </Sheet>
    );
}
