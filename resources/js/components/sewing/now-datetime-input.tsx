import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { nowLocalInput } from '@/lib/format';
import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Live "now" for datetime-local fields: ticks every 20s and catches up as soon as the tab is shown again. */
function useLiveNow(): string {
    const [now, setNow] = useState(nowLocalInput);

    useEffect(() => {
        const refresh = () => setNow(nowLocalInput());
        const onVisible = () => document.visibilityState === 'visible' && refresh();
        const timer = window.setInterval(refresh, 20_000);

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', refresh);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    return now;
}

type NowDateTimeInputProps = {
    id?: string;
    /** '' = belum diubah: field menampilkan jam sekarang dan server mencatat waktu saat disimpan. */
    value: string;
    onChange: (value: string) => void;
};

/**
 * Tanggal & jam transaksi yang bawaannya selalu "sekarang". Selama belum diubah, isinya ikut jam berjalan
 * (juga saat drawer/tab dibuka lagi) dan yang dikirim kosong, jadi server memakai waktu simpan yang tepat.
 * Kalau diubah (mencatat mundur), nilai itu yang dipakai; tombol "Sekarang" mengembalikannya.
 */
export function NowDateTimeInput({ id, value, onChange }: NowDateTimeInputProps) {
    const now = useLiveNow();
    const isNow = value === '';

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
                <Input id={id} type="datetime-local" className="flex-1" value={isNow ? now : value} onChange={(event) => onChange(event.target.value === now ? '' : event.target.value)} />
                {!isNow && (
                    <Button type="button" variant="outline" onClick={() => onChange('')}>
                        <Clock />
                        Sekarang
                    </Button>
                )}
            </div>
            <p className="text-sm text-muted-foreground">{isNow ? 'Otomatis jam sekarang. Ubah hanya kalau mencatat mundur.' : 'Memakai tanggal yang Anda pilih.'}</p>
        </div>
    );
}
